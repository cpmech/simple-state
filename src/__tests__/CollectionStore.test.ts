import { sleep } from '@cpmech/basic';
import { SimpleStore } from '../SimpleStore';
import { CollectionStore } from '../CollectionStore';

jest.setTimeout(1000);

interface ISummary {
  android: number;
  ios: number;
  web: number;
}

const newZeroSummary = (): ISummary => ({ android: 0, ios: 0, web: 0 });

type Group = 'A' | 'B' | 'C';
type Query = 'name';
type Action = 'changeName';

interface IState {
  names: string[]; // customers' data, etc
}

const groups: Group[] = ['A', 'B', 'C'];

const onLoad = async (id: Group) => {
  console.log(`... ${id} is loading ...`);
  await sleep(50 + Math.random() * 100);
  return {
    names: ['Bender', 'Leela', 'Fry'],
  };
};

const onSummary = async (id: Group, state: IState): Promise<ISummary> => {
  console.log(`... ${id} is summarizing ...`);
  await sleep(50 + Math.random() * 100);
  if (id === 'A') {
    return {
      android: 1,
      ios: 2,
      web: 3,
    };
  }
  if (id === 'B') {
    return {
      android: 3,
      ios: 2,
      web: 1,
    };
  }
  return {
    android: 0,
    ios: 0,
    web: 4,
  };
};

const onAction = async (id: Group, state: IState, action: Action, payload: any) => {
  switch (action) {
    case 'changeName':
      const [i, name] = payload;
      const newCustomers = state.names.map((n, j) => (j === i ? name : n));
      return {
        ...state,
        customers: newCustomers,
      };
    default:
      return state;
  }
};

const onQuery = (id: Group, state: IState, query: Query, payload: any) => {
  switch (query) {
    case 'name':
      const [i] = payload;
      return state.names[i];
  }
};

const customers = groups.reduce(
  (acc, id) => ({
    ...acc,
    [id]: new SimpleStore<Group, IState, ISummary, Action, Query>(
      id,
      onLoad,
      onSummary,
      onAction,
      onQuery,
    ),
  }),
  {} as { [id in Group]: SimpleStore<Group, IState, ISummary, Action, Query> },
);

const spawnLoadAllCustomers = (forceReload = false) => {
  for (const id of groups) {
    customers[id].load(forceReload);
  }
};

describe('CollectionStore', () => {
  it('should call reducer and notify observers', async () => {
    const sum = newZeroSummary();
    const reducer = (
      acc: ISummary,
      store: SimpleStore<Group, IState, ISummary, Action, Query>,
    ): ISummary => {
      console.log(`... store[${store.id}] reducer ...`);
      if (store.summary) {
        return {
          android: acc.android + store.summary.android,
          ios: acc.ios + store.summary.ios,
          web: acc.web + store.summary.web,
        };
      } else {
        return acc;
      }
    };
    const summary = new CollectionStore(groups, customers, sum, reducer);
    spawnLoadAllCustomers();

    // listen
    let ready = false;
    const unsubscribe = summary.subscribe(() => {
      if (summary.error) {
        fail('got error: ' + summary.error);
      }
      if (!summary.error && !summary.loading) {
        ready = true;
      }
    }, 'test1');

    if (!summary.sum) {
      fail('summary data must defined');
    }

    while (!ready) {
      await sleep(50);
    }

    expect(summary.sum).toEqual({ android: 4, ios: 4, web: 8 });
    unsubscribe();
  });
});
