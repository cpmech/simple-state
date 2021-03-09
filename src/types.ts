export interface IAction {
  name: string;
  error: string;
  inProgress: boolean;
  completed: boolean;
}

export type IActions<T extends string> = { [name in T]: IAction };

export type IObserver = () => void;

export interface IObservers {
  [name: string]: IObserver;
}
