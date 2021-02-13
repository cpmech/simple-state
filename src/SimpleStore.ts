import { Iany } from '@cpmech/basic';
import { IObserver, IObservers, ISimpleStore } from './types';
import { NOTIFY_DELAY } from './constants';

export class SimpleStore<STATE extends Iany, SUMMARY extends Iany | null> implements ISimpleStore {
  // flags
  /* readyonly */ error = '';
  /* readyonly */ ready = false; // noError and notLoading

  // state
  /* readyonly */ state: STATE;
  /* readyonly */ summary: SUMMARY | null = null;

  // observers holds everyone who is interested in state updates
  private observers: IObservers = {};

  // onChange notifies all observers that the state has been changed
  protected onChange = () =>
    Object.keys(this.observers).forEach((name) => {
      if (this.observers[name]) {
        this.observers[name]();
      }
    });

  // prepare for changes
  protected begin = () => {
    this.error = '';
    this.ready = false;
    this.onChange();
  };

  // notify observers
  protected end = (withError = '') => {
    this.error = withError;
    this.ready = !withError;
    setTimeout(() => this.onChange(), NOTIFY_DELAY);
  };

  // constructor
  constructor(
    private newZeroState: () => STATE,
    private onStart: (itemIdOrGroup: string) => Promise<STATE>,
    private onSummary?: (state: STATE) => SUMMARY,
    private messageErrorLoad?: string,
    private messageErrorSummary?: string,
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

  // load (setter) function
  start = async (itemIdOrGroup: string, forceReload = true, callSummary = true) => {
    if (this.ready && !forceReload) {
      return;
    }
    this.begin();
    try {
      this.state = await this.onStart(itemIdOrGroup);
      if (this.onSummary && callSummary) {
        this.summary = this.onSummary(this.state);
      }
    } catch (error) {
      return this.end(this.messageErrorLoad || error.message);
    }
    this.end();
  };

  // compute summary (setter) function
  doSummary = () => {
    if (this.onSummary) {
      this.begin();
      try {
        this.summary = this.onSummary(this.state);
      } catch (error) {
        return this.end(this.messageErrorSummary || error.message);
      }
      this.end();
    }
  };

  // reset state and summary
  reset = () => {
    this.begin();
    this.state = this.newZeroState();
    this.summary = null;
    this.end();
  };

  clearError = () => {
    if (this.error) {
      this.begin();
      this.error = '';
      this.end();
    }
  };
}
