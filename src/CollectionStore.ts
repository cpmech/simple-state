import { Mutex } from 'async-mutex';
import { Iany } from '@cpmech/basic';
import { IObserver, IObservers, ISimpleStore } from './types';
import { NOTIFY_DELAY } from './constants';

interface IStoreStatus {
  started: boolean;
  unsubscribe: () => void;
}

export class CollectionStore<
  GROUP extends string,
  STORE extends ISimpleStore,
  SUMMARY extends Iany | null
> {
  // flags
  /* readyonly */ error = '';
  /* readyonly */ started = false;

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
  private notifyBeginStart = () => {
    this.error = '';
    this.started = false;
    this.onChange();
  };

  // notify observers
  private notifyEndStart = (withError = '') => {
    this.error = withError;
    this.started = !this.error;
    setTimeout(() => this.onChange(), NOTIFY_DELAY);
  };

  // subscribe all
  constructor(
    readonly groups: GROUP[],
    storeMaker: () => STORE,
    private newZeroSummary?: () => SUMMARY, // must be given with reducer
    private reducer?: (acc: SUMMARY, curr: STORE) => SUMMARY, // must ge given with newZeroSummary
  ) {
    // check input
    if ((this.reducer && !this.newZeroSummary) || (!this.reducer && this.newZeroSummary)) {
      throw new Error('newZeroSummary function must be given with reducer function');
    }

    // allocate all stores
    this.stores = groups.reduce(
      (acc, id) => ({ ...acc, [id]: storeMaker() }),
      {} as { [id in GROUP]: STORE },
    );

    // initialize summary
    this.summary = newZeroSummary ? newZeroSummary() : null;

    // set all observers
    this.status = groups.reduce(
      (acc, group) => ({
        ...acc,
        [group]: {
          started: false,
          unsubscribe: this.stores[group].subscribe(async () => {
            const { error, started } = this.stores[group];
            if (error) {
              this.notifyEndStart(error);
            }
            if (started) {
              await this.onStarted(group);
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

  getStore(group: GROUP): STORE {
    return this.stores[group];
  }

  // will send the group as itemId to each store doStart function
  spawnStartAll = (forceReload?: boolean, callSummary?: boolean) => {
    if (this.started && !forceReload) {
      return;
    }
    this.notifyBeginStart(); // matched by this.end within onAllStarted
    for (const group of this.groups) {
      this.status[group].started = false; // must clear data here in case we're reloading
    }
    for (const group of this.groups) {
      this.stores[group].doStart(group, forceReload, callSummary);
    }
  };

  private onAllStarted = () => {
    if (this.summary && this.reducer && this.newZeroSummary) {
      this.summary = this.newZeroSummary();
      for (const group of this.groups) {
        this.summary = this.reducer(this.summary, this.stores[group]);
      }
    }
    this.notifyEndStart();
  };

  private onStarted = async (group: GROUP) => {
    const release = await this.mutex.acquire();
    this.status[group].started = true;
    // check if everyone else started too
    const allStarted = this.groups.reduce((acc, g) => {
      if (!this.status[g].started) {
        return false;
      }
      return acc;
    }, true);
    if (!this.started && allStarted) {
      // call just once
      this.onAllStarted();
    }
    release();
  };
}
