import { sleep } from '@cpmech/basic';
import { SimpleStore } from '../SimpleStore';
import { CollectionStore } from '../CollectionStore';

jest.setTimeout(1000);

type Group = 'A' | 'B' | 'C' | 'D' | 'E';

const groups: Group[] = ['A', 'B', 'C'];

interface ICustomer {
  name: string;
  email: string;
}

interface IState {
  customers: ICustomer[] | null;
}

interface ISummary {
  android: number;
  ios: number;
  web: number;
}

const newZeroState = (): IState => ({
  customers: null,
});

const newZeroSummary = (): ISummary => ({ android: 0, ios: 0, web: 0 });

const onLoad = async (group: Group): Promise<IState> => {
  console.log(`... ${group} is loading ...`);
  await sleep(50 + Math.random() * 100);
  return {
    customers: [
      { name: 'Bender', email: 'bender.rodriguez@futurama.co' },
      { name: 'Leela', email: 'turanga.leela@futurama.co' },
      { name: 'Fry', email: 'phillip.j.fry@futurama.co' },
    ],
  };
};

const onSummary = async (group: Group, state: IState): Promise<ISummary> => {
  console.log(`... ${group} is summarizing ...`);
  await sleep(50 + Math.random() * 100);
  if (group === 'A') {
    return {
      android: 1,
      ios: 2,
      web: 3,
    };
  }
  if (group === 'B') {
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

class Customers extends SimpleStore<Group, IState, ISummary> {
  constructor(group: Group) {
    super(group, newZeroState, onLoad, onSummary);
  }
  findEmail = (name: string): string => {
    if (this.state.customers) {
      const customer = this.state.customers.find((c) => c.name === name);
      return customer ? customer.email : '';
    }
    return '';
  };
}

describe('CollectionStore', () => {
  it('should initialize all stores', async () => {
    const reducer = (acc: ISummary, store: Customers): ISummary => {
      console.log(`... store[${store.group}] reducer ...`);
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

    const collection = new CollectionStore<Group, Customers, ISummary>(
      groups,
      (group: Group) => new Customers(group),
      newZeroSummary,
      reducer,
    );

    expect(collection.groups).toEqual(['A', 'B', 'C']);
    expect(collection.error).toBe('');
    expect(collection.loading).toBe(false);
    expect(collection.lastUpdatedAt).toBe(1);
    expect(collection.isReady()).toBe(false);

    let ready = false;
    const unsubscribe = collection.subscribe(() => {
      if (collection.isReady()) {
        ready = true;
      }
    }, 'test');

    collection.load();

    while (!ready) {
      await sleep(50);
    }

    unsubscribe();

    expect(collection.summary).toEqual({ android: 4, ios: 4, web: 8 });
  });
});
