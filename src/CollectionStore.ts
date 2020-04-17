import { Mutex } from 'async-mutex';
import { Iany } from '@cpmech/basic';
import { IObserver, IObservers, ISimpleStore } from './types';
import { NOTIFY_DELAY } from './constants';

interface IStoreStatus {
  error: string;
  ready: boolean;
  unsubscribe: () => void;
}

export class CollectionStore<
  GROUP extends string,
  STORE extends ISimpleStore,
  SUMMARY extends Iany | null
> implements ISimpleStore {
  // flags
  /* readyonly */ error = '';
  /* readyonly */ loading = false;
  /* readyonly */ lastUpdatedAt: number = 1; // unix time in milliseconds

  // stores and summary
  /* readyonly */ stores: { [id in GROUP]: STORE };
  /* readyonly */ summary: SUMMARY | null;

  // status of all stores and mutex to access the status map
  private status: { [id in GROUP]: IStoreStatus };
  private mutex = new Mutex();

  // observers holds everyone who is interested in state updates
  private observers: IObservers = {};

  // onChange notifies all observers that the state has been changed
  private onChange = () =>
    Object.keys(this.observers).forEach((name) => {
      if (this.observers[name]) {
        this.observers[name]();
      }
    });

  // prepare for changes
  private begin = () => {
    this.error = '';
    this.loading = true;
    this.onChange();
  };

  // notify observers
  private end = (withError = '') => {
    this.error = withError;
    this.loading = false;
    setTimeout(() => this.onChange(), NOTIFY_DELAY);
  };

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////               ///////////////////////////////////////////////////////////////////////////////////////////////
  ////     main      ///////////////////////////////////////////////////////////////////////////////////////////////
  ////               ///////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // subscribe all
  constructor(
    readonly groups: GROUP[],
    storeMaker: (group: GROUP) => STORE,
    private newZeroSummary?: () => SUMMARY,
    private reducer?: (acc: SUMMARY, curr: STORE) => SUMMARY,
  ) {
    // allocate all stores
    this.stores = groups.reduce(
      (acc, id) => ({ ...acc, [id]: storeMaker(id) }),
      {} as { [id in GROUP]: STORE },
    );
    // initialize summary
    this.summary = newZeroSummary ? newZeroSummary() : null;
    // set all observers
    this.status = groups.reduce(
      (acc, group) => ({
        ...acc,
        [group]: {
          error: '',
          ready: false,
          unsubscribe: this.stores[group].subscribe(async () => {
            const { error, loading, lastUpdatedAt } = this.stores[group];
            const ready = !error && !loading && lastUpdatedAt > 1;
            if (ready) {
              await this.onReady(group);
            }
            if (error) {
              await this.onError(group, error);
            }
          }, `CollectionStore${Date.now()}`),
        },
      }),
      {} as { [group in GROUP]: IStoreStatus },
    );
  }

  // subscribe adds someone to be notified about state updates
  // NOTE: returns a function to unsubscribe
  subscribe = (observer: IObserver, name: string): (() => void) => {
    this.observers[name] = observer;
    return () => {
      delete this.observers[name];
    };
  };

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////               ///////////////////////////////////////////////////////////////////////////////////////////////
  ////    getters    ///////////////////////////////////////////////////////////////////////////////////////////////
  ////               ///////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  isReady(): boolean {
    return !this.error && !this.loading && this.lastUpdatedAt > 1;
  }

  getStore(group: GROUP): STORE {
    return this.stores[group];
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////               ///////////////////////////////////////////////////////////////////////////////////////////////
  ////    setters    ///////////////////////////////////////////////////////////////////////////////////////////////
  ////               ///////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // spawn load, don't need to await
  load = async (forceReload?: boolean, callSummary?: boolean) => {
    for (const group of this.groups) {
      this.stores[group].load(forceReload, callSummary);
    }
  };

  clearSummaryAndStatus = () => {
    this.begin();
    this.summary = this.newZeroSummary ? this.newZeroSummary() : null;
    this.groups.forEach((group) => {
      this.status[group].error = '';
      this.status[group].ready = false;
    });
    this.end();
  };

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////                 //////////////////////////////////////////////////////////////////////////////////////////////
  ////     private     //////////////////////////////////////////////////////////////////////////////////////////////
  ////                 //////////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  private onAllReady = () => {
    this.begin();
    if (this.summary && this.reducer) {
      for (const group of this.groups) {
        this.summary = this.reducer(this.summary, this.stores[group]);
      }
    }
    this.lastUpdatedAt = Date.now();
    this.end();
  };

  private onReady = async (group: GROUP) => {
    const release = await this.mutex.acquire();
    try {
      this.status[group].ready = true;
      // check if everyone else is ready too
      const allReady = this.groups.reduce((acc, g) => {
        if (!this.status[g].ready) {
          return false;
        }
        return acc;
      }, true);
      if (allReady) {
        this.onAllReady();
      }
    } catch (err) {
      this.error = err.message;
    } finally {
      release();
    }
  };

  private onError = async (group: GROUP, error: string) => {
    const release = await this.mutex.acquire();
    try {
      this.status[group].error = error;
      // notify observers too
      this.begin();
      this.error = error;
      this.end();
    } catch (err) {
      this.error = err.message;
    } finally {
      release();
    }
  };
}
