export type IObserver = () => void;

export interface IObservers {
  [name: string]: IObserver;
}

export interface ISimpleStore {
  error: string;
  ready: boolean;
  subscribe: (observer: IObserver, name: string) => () => void;
  start: (itemId: string, forceReload?: boolean, callSummary?: boolean) => Promise<void>;
}
