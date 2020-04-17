export type IObserver = () => void;

export interface IObservers {
  [name: string]: IObserver;
}

export interface ISimpleStore {
  error: string;
  loading: boolean;
  lastUpdatedAt: number;
  subscribe: (observer: IObserver, name: string) => () => void;
  load: (forceReload?: boolean, callSummary?: boolean) => Promise<void>;
}

export interface IGQLClientResponse {
  res?: any;
  err?: string;
}

export type IQueryFunction = (que: string) => Promise<IGQLClientResponse>;
