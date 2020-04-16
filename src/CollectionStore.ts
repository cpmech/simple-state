import { Mutex } from 'async-mutex';
import { Iany } from '@cpmech/basic';
import { IObserver, IObservers, ISimpleStore } from './types';
import { NOTIFY_DELAY } from './constants';

interface IStoreStatus {
  error: string;
  ready: boolean;
  unsubscribe: () => void;
}

export class CollectionStore<ID extends string, STORE extends ISimpleStore, SUMMARY extends Iany> {
  /* readonly */ error = ''; // last error
  /* readonly */ loading = false;
  /* readonly */ lastUpdatedAt: number = 1; // unix time in milliseconds

  // summary data and reducer
  /* readonly */ sum?: SUMMARY;
  /* readonly */ reducer?: (acc: SUMMARY, curr: STORE) => SUMMARY;

  // status of all stores and mutex to access the status map
  private status: { [id in ID]: IStoreStatus };
  private mutex = new Mutex();

  // observers holds everyone who is interested in state updates
  private observers: IObservers = {};

  // onChange notifies all observers that the state has been changed
  private onChange = () =>
    Object.keys(this.observers).forEach((name) => this.observers[name] && this.observers[name]());

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

  // subscribe all
  constructor(
    private ids: ID[],
    private stores: { [id in ID]: STORE },
    data?: SUMMARY,
    reducer?: (acc: SUMMARY, curr: STORE) => SUMMARY,
  ) {
    this.sum = data;
    this.reducer = reducer;
    this.status = ids.reduce(
      (acc, id) => ({
        ...acc,
        [id]: {
          error: '',
          ready: false,
          unsubscribe: stores[id].subscribe(async () => {
            const { error, loading, lastUpdatedAt } = stores[id];
            const ready = !error && !loading && lastUpdatedAt > 1;
            if (ready) {
              await this.onReady(id);
            }
            if (error) {
              await this.onError(id, error);
            }
          }, '@cpmech/simple-state/ReducerStore'),
        },
      }),
      {} as { [id in ID]: IStoreStatus },
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
  ////    setters    ///////////////////////////////////////////////////////////////////////////////////////////////
  ////               ///////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  reset = (data?: SUMMARY) => {
    this.begin();
    this.sum = data;
    this.ids.forEach((id) => {
      this.status[id].error = '';
      this.status[id].ready = false;
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
    if (this.sum && this.reducer) {
      for (const id of this.ids) {
        this.sum = this.reducer(this.sum, this.stores[id]);
      }
    }
    this.lastUpdatedAt = Date.now();
    this.end();
  };

  private onReady = async (id: ID) => {
    const release = await this.mutex.acquire();
    try {
      this.status[id].ready = true;
      // check if everyone else is ready too
      const allReady = this.ids.reduce((acc, id) => {
        if (!this.status[id].ready) {
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

  private onError = async (id: ID, error: string) => {
    const release = await this.mutex.acquire();
    try {
      this.status[id].error = error;
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
