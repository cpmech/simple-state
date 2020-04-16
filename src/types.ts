export type IObserver = () => void;

export interface IObservers {
  [name: string]: IObserver;
}

export interface ISimpleStore {
  error: string;
  loading: boolean;
  lastUpdatedAt: number;
  subscribe: (observer: IObserver, name: string) => () => void;
}
