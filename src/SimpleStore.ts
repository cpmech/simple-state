import { Iany, elog } from '@cpmech/basic';
import { GraphQLClient } from 'graphql-request';
import { IObserver, IObservers, IGQLClientResponse, IQueryFunction, ISimpleStore } from './types';
import { NOTIFY_DELAY } from './constants';

export class SimpleStore<GROUP extends string, STATE extends Iany, SUMMARY extends Iany | null>
  implements ISimpleStore {
  // flags
  /* readyonly */ error = '';
  /* readyonly */ loading = false;
  /* readyonly */ lastUpdatedAt = 1; // unix time in milliseconds

  // state
  /* readyonly */ state: STATE;
  /* readyonly */ summary: SUMMARY | null = null;

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

  // constructor
  constructor(
    readonly group: GROUP,
    private newZeroState: () => STATE,
    private onLoad: (group: GROUP, query: IQueryFunction) => Promise<STATE>,
    private onSummary?: (group: GROUP, state: STATE) => Promise<SUMMARY>,
    private api?: GraphQLClient,
  ) {
    this.state = newZeroState();
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

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////               ///////////////////////////////////////////////////////////////////////////////////////////////
  ////    setters    ///////////////////////////////////////////////////////////////////////////////////////////////
  ////               ///////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // load (setter) function
  load = async (forceReload = false, callSummary = true) => {
    if (this.lastUpdatedAt > 1 && !forceReload) {
      return;
    }
    this.begin();
    try {
      this.state = await this.onLoad(this.group, this.query);
      if (this.onSummary && callSummary) {
        this.summary = await this.onSummary(this.group, this.state);
      }
      this.lastUpdatedAt = Date.now();
    } catch (error) {
      return this.end(error);
    }
    this.end();
  };

  // compute summary (setter) function
  doSummary = async (errorMessage = '') => {
    if (this.onSummary) {
      this.begin();
      try {
        this.summary = await this.onSummary(this.group, this.state);
      } catch (error) {
        return this.end(errorMessage || error);
      }
      this.end();
    }
  };

  // clear state and reset summary to null
  reset = () => {
    this.begin();
    this.state = this.newZeroState();
    this.summary = null;
    this.end();
  };

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////                 //////////////////////////////////////////////////////////////////////////////////////////////
  ////    protected    //////////////////////////////////////////////////////////////////////////////////////////////
  ////                 //////////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  protected query = async (que: string): Promise<IGQLClientResponse> => {
    if (!this.api) {
      return { err: 'GraphQL API is not available' };
    }
    let res: any;
    try {
      res = await this.api.request(que);
    } catch (err) {
      elog(err);
      return { err };
    }
    return { res };
  };

  protected mutation = async (mut: string, vars?: Iany): Promise<IGQLClientResponse> => {
    if (!this.api) {
      return { err: 'GraphQL API is not available' };
    }
    let res: any;
    try {
      res = await this.api.request(mut, vars);
    } catch (err) {
      elog(err);
      return { err };
    }
    return { res };
  };
}