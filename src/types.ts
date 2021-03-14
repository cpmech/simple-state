export interface IAction<T extends string> {
  name: T;
  error: string;
  inProgress: boolean;
  successCount: number;
  totalCount: number;
}

export type IActions<T extends string> = { [name in T]: IAction<T> };

export type IObserver = () => void;

export interface IObservers {
  [name: string]: IObserver;
}

export const newZeroAction = <T extends string>(name: T): IAction<T> => ({
  name,
  error: '',
  inProgress: false,
  successCount: 0,
  totalCount: 0,
});
