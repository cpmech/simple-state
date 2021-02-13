export type IObserver = () => void;

export interface IObservers {
  [name: string]: IObserver;
}

export interface ISimpleStore {
  error: string;
  started: boolean;
  subscribe: (observer: IObserver, name: string) => () => void;
  doStart: (itemId: string, forceReload?: boolean, callSummary?: boolean) => Promise<void>;
}
