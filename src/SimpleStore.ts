import { Iany } from '@cpmech/basic';
import { IObserver, IObservers } from './types';
import { NOTIFY_DELAY } from './constants';

export class SimpleStore<
  ID extends string,
  STATE extends Iany,
  SUMMARY extends Iany,
  ACTION extends string,
  QUERY extends string
> {
  /* readonly */ error = '';
  /* readonly */ loading = false;
  /* readonly */ lastUpdatedAt = 1; // unix time in milliseconds

  /* readonly */ state?: STATE;
  /* readonly */ summary?: SUMMARY;

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

  // constructor
  constructor(
    readonly id: ID,
    private onLoad: (id: ID) => Promise<STATE>,
    private onSummary?: (id: ID, state: STATE) => Promise<SUMMARY>,
    private onAction?: (id: ID, state: STATE, action: ACTION, payload: any) => Promise<STATE>,
    private onQuery?: (id: ID, state: STATE, query: QUERY, payload: any) => any,
  ) {}

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

  query = (query: QUERY, payload: any, errorMessage = ''): any => {
    if (this.state && this.onQuery) {
      try {
        return this.onQuery(this.id, this.state, query, payload);
      } catch (error) {
        this.error = errorMessage || error;
      }
    }
  };

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ////               ///////////////////////////////////////////////////////////////////////////////////////////////
  ////    setters    ///////////////////////////////////////////////////////////////////////////////////////////////
  ////               ///////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  load = async (forceReload = false, callSummary = true) => {
    if (this.lastUpdatedAt > 1 && !forceReload) {
      return;
    }
    this.begin();
    try {
      this.state = await this.onLoad(this.id);
      if (this.state && this.onSummary && callSummary) {
        this.summary = await this.onSummary(this.id, this.state);
      }
      this.lastUpdatedAt = Date.now();
    } catch (error) {
      return this.end(error);
    }
    this.end();
  };

  action = async (action: ACTION, payload: any, errorMessage = '') => {
    if (this.state && this.onAction) {
      this.begin();
      try {
        this.state = await this.onAction(this.id, this.state, action, payload);
      } catch (error) {
        return this.end(errorMessage || error);
      }
      this.end();
    }
  };

  doSummary = async (errorMessage = '') => {
    if (this.state && this.onSummary) {
      this.begin();
      try {
        this.summary = await this.onSummary(this.id, this.state);
      } catch (error) {
        return this.end(errorMessage || error);
      }
      this.end();
    }
  };
}
