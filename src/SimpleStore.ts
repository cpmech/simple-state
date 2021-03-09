import { Iany } from '@cpmech/basic';
import { IActions, IObserver, IObservers } from './types';
import { NOTIFY_DELAY } from './constants';

export class SimpleStore<ACTION extends string, STATE extends Iany, SUMMARY extends Iany | null> {
  // state
  /* readyonly */ actions: IActions<ACTION>;
  /* readyonly */ state: STATE;
  /* readyonly */ summary: SUMMARY | null = null;

  /**
   * observers holds everyone who is interested in state updates
   */
  private observers: IObservers = {};

  /**
   * onChange notifies all observers that the state has been changed
   * @remarks Observers may read actions, state, and summary, but not change them directly
   */
  protected onChange = () =>
    Object.keys(this.observers).forEach((name) => {
      if (this.observers[name]) {
        this.observers[name]();
      }
    });

  /**
   * initAction initializes an action and notifies all observers
   * @param name - the name of the action
   * @remarks The action is set with: inProgress=true and completed=false
   */
  protected initAction = (name: ACTION) => {
    this.actions[name].error = '';
    this.actions[name].inProgress = true;
    this.actions[name].completed = false;
    this.onChange();
  };

  /**
   * endAction finalizes an action and notifies all observers
   * @param name - the name of the action
   * @param error - an error message, if any
   * @remarks The action is set with: inProgress=false and completed=true
   * @remarks We will wait by NOTIFY_DELAY milliseconds because the user may have just called initAction
   */
  protected endAction = (name: ACTION, error = '') => {
    this.actions[name].error = error;
    this.actions[name].inProgress = false;
    this.actions[name].completed = true;
    setTimeout(() => this.onChange(), NOTIFY_DELAY);
  };

  /**
   * constructor returns a new SimpleStore
   * @param actionNames - the name of all possible actions
   * @param newZeroState - a function to generate "empty" state data
   * @param onSummary - a function to "reduce" data. Automatically called by callStart and optionally by callSummary
   * @remarks The state is initialized by calling newZeroState()
   */
  constructor(
    readonly actionNames: ACTION[],
    private newZeroState: () => STATE,
    private onSummary?: (state: STATE) => Promise<SUMMARY>,
  ) {
    this.actions = actionNames.reduce(
      (acc, curr) => ({
        ...acc,
        [curr]: { name: curr, error: '', inProgress: false, completed: true },
      }),
      {} as IActions<ACTION>,
    );
    this.state = newZeroState();
  }

  /**
   * subscribe adds someone to be notified about state updates
   * @param observer - the observer function
   * @param observerName - the name of the observer function. Helps to prevent duplicates
   * @returns a function to unsubscribe
   * @remarks NOTE: the returned function should be called to unsubscribe this observer
   */
  subscribe = (observer: IObserver, observerName: string): (() => void) => {
    this.observers[observerName] = observer;
    return () => {
      delete this.observers[observerName];
    };
  };

  /**
   * updateState calls the update function that updates state
   * @param actionName - the name of the action; e.g. "updateUser"
   * @param update - a function that updates state
   * @param callSummary - [default=true] call the summary function, if available
   * @param messageError - an alternative error message
   */
  updateState = async (
    actionName: ACTION,
    update: () => Promise<void>,
    callSummary = true,
    messageError?: string,
  ) => {
    this.initAction(actionName);
    try {
      await update();
      if (this.onSummary && callSummary) {
        this.summary = await this.onSummary(this.state);
      }
    } catch (error) {
      const err: string =
        messageError ||
        error?.response?.data?.error ||
        error.message ||
        'Cannot load data from server';
      this.endAction(actionName, err);
      return;
    }
    this.endAction(actionName);
  };

  /**
   * callSummary calls onSummary function, if available
   * @param actionName - the name of the action calling onSummary; e.g. "update"
   * @param messageError - an alternative error message
   */
  callSummary = async (actionName: ACTION, messageError?: string) => {
    if (!this.onSummary) {
      return;
    }
    this.initAction(actionName);
    try {
      this.summary = await this.onSummary(this.state);
    } catch (error) {
      this.endAction(actionName, messageError || error.message);
      return;
    }
    this.endAction(actionName);
  };

  /**
   * clearState resets state to newZeroState and nullifies the summary
   * @param actionName - the name of the action; e.g. "clearState"
   */
  clearState = (actionName: ACTION) => {
    this.initAction(actionName);
    this.state = this.newZeroState();
    this.summary = null;
    this.endAction(actionName);
  };

  /**
   * resetAction resets an action
   * @param name - the name of the action
   * @remarks The action is set with: inProgress=false and completed=true. The error is cleared as well
   */
  resetAction = (name: ACTION) => {
    this.actions[name].error = '';
    this.actions[name].inProgress = false;
    this.actions[name].completed = true;
  };
}
