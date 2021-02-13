import { sleep } from '@cpmech/basic';
import { SimpleStore } from '../SimpleStore';
import { CollectionStore } from '../CollectionStore';
import { IObserver } from '../types';

jest.setTimeout(1500);

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

let counter = 0;

const onStart = async (group: string): Promise<IState> => {
  await sleep(50 + Math.random() * 100);
  counter++;
  if (group === 'A') {
    return {
      customers: [
        { name: 'Bender', email: 'bender.rodriguez@futurama.co' },
        { name: 'Leela', email: 'turanga.leela@futurama.co' },
        { name: 'Fry', email: 'phillip.j.fry@futurama.co' },
      ],
    };
  }
  if (group == 'B') {
    return {
      customers: [
        { name: 'Prof', email: 'professor.hubert.j.farnsworth@futurama.co' },
        { name: 'Amy', email: 'amy.wong@futurama.co' },
        { name: 'Hermes', email: 'hermes.conrad@futurama.co' },
      ],
    };
  }
  return {
    customers: [
      { name: 'Zoidberg', email: 'dr.john.a.zoidberg@futurama.co' },
      { name: 'Zapp', email: 'zapp.brannigan@futurama.co' },
      { name: 'Kif', email: 'kif.kroker@futurama.co' },
    ],
  };
};

const onSummary = (state: IState): ISummary => {
  if (state.customers?.find((c) => c.name === 'Bender')) {
    return {
      android: 1,
      ios: 2,
      web: 3,
    };
  }
  if (state.customers?.find((c) => c.name === 'Prof')) {
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

class Customers extends SimpleStore<IState, ISummary> {
  constructor() {
    super(newZeroState, onStart, onSummary);
  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

describe('CollectionStore', () => {
  const reducer = (acc: ISummary, store: Customers): ISummary => {
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
    () => new Customers(),
    newZeroSummary,
    reducer,
  );

  let called = 0;
  let started = false;

  const unsubscribe = collection.subscribe(() => {
    called++;
    if (collection.started) {
      started = true;
    }
  }, 'test');

  it('should initialize all stores', async () => {
    expect(collection.groups).toEqual(['A', 'B', 'C']);
    expect(collection.error).toBe('');
    expect(collection.started).toBe(false);
    expect(collection.stores.A.state.customers).toBeNull();
    expect(collection.stores.B.state.customers).toBeNull();
    expect(collection.stores.C.state.customers).toBeNull();
  });

  it('should load and notify the observer', async () => {
    expect(counter).toBe(0);
    collection.spawnStartAll();
    while (!started) {
      await sleep(50);
    }
    expect(called).toBe(2); // started=false, then true
    expect(counter).toBe(3);
    expect(collection.started).toBe(true);
    expect(collection.stores.A.state.customers).toStrictEqual([
      { name: 'Bender', email: 'bender.rodriguez@futurama.co' },
      { name: 'Leela', email: 'turanga.leela@futurama.co' },
      { name: 'Fry', email: 'phillip.j.fry@futurama.co' },
    ]);
    expect(collection.summary).toEqual({ android: 4, ios: 4, web: 8 });
    await sleep(200);
    expect(collection.summary).toEqual({ android: 4, ios: 4, web: 8 });
  });

  it('should load again and notify the observer', async () => {
    started = false;
    collection.spawnStartAll(true);
    while (!started) {
      await sleep(50);
    }
    expect(called).toBe(4); // started=false, then true
    expect(counter).toBe(6);
    expect(collection.started).toBe(true);
    expect(collection.stores.A.state.customers).toStrictEqual([
      { name: 'Bender', email: 'bender.rodriguez@futurama.co' },
      { name: 'Leela', email: 'turanga.leela@futurama.co' },
      { name: 'Fry', email: 'phillip.j.fry@futurama.co' },
    ]);
    expect(collection.stores.B.state.customers).toStrictEqual([
      { name: 'Prof', email: 'professor.hubert.j.farnsworth@futurama.co' },
      { name: 'Amy', email: 'amy.wong@futurama.co' },
      { name: 'Hermes', email: 'hermes.conrad@futurama.co' },
    ]);
    expect(collection.stores.C.state.customers).toStrictEqual([
      { name: 'Zoidberg', email: 'dr.john.a.zoidberg@futurama.co' },
      { name: 'Zapp', email: 'zapp.brannigan@futurama.co' },
      { name: 'Kif', email: 'kif.kroker@futurama.co' },
    ]);
    expect(collection.summary).toEqual({ android: 4, ios: 4, web: 8 });
    await sleep(200);
    expect(collection.summary).toEqual({ android: 4, ios: 4, web: 8 });
  });

  it('should handle an observer that turned null', async () => {
    expect(called).toBe(4);
    collection.subscribe((null as unknown) as IObserver, 'temporary'); // <<< force null (unusual)
    started = false;
    collection.spawnStartAll(true);
    while (!started) {
      await sleep(50);
    }
    expect(called).toBe(6);
    expect(counter).toBe(9); // all loaded again
  });

  it('should return the store by group', async () => {
    expect(collection.getStore('A').state.customers).toStrictEqual([
      { name: 'Bender', email: 'bender.rodriguez@futurama.co' },
      { name: 'Leela', email: 'turanga.leela@futurama.co' },
      { name: 'Fry', email: 'phillip.j.fry@futurama.co' },
    ]);
    expect(collection.getStore('B').state.customers).toStrictEqual([
      { name: 'Prof', email: 'professor.hubert.j.farnsworth@futurama.co' },
      { name: 'Amy', email: 'amy.wong@futurama.co' },
      { name: 'Hermes', email: 'hermes.conrad@futurama.co' },
    ]);
    expect(collection.getStore('C').state.customers).toStrictEqual([
      { name: 'Zoidberg', email: 'dr.john.a.zoidberg@futurama.co' },
      { name: 'Zapp', email: 'zapp.brannigan@futurama.co' },
      { name: 'Kif', email: 'kif.kroker@futurama.co' },
    ]);
  });

  it('should unsubscribe observer', async () => {
    unsubscribe();
    expect(called).toBe(6);
    expect(counter).toBe(9);
    collection.spawnStartAll(true);
    await sleep(500);
    expect(called).toBe(6); // we're not being notified
    expect(counter).toBe(12); // all loaded again
    expect(collection.summary).toEqual({ android: 4, ios: 4, web: 8 });
  });
});

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

describe('CollectionStore wrong definition', () => {
  it('should throw error on incorrect input', () => {
    const reducer = (acc: ISummary, store: Customers): ISummary => acc;

    expect(() => {
      new CollectionStore<Group, Customers, ISummary>(
        groups,
        () => new Customers(),
        undefined,
        reducer,
      );
    }).toThrowError('newZeroSummary function must be given with reducer function');

    expect(() => {
      new CollectionStore<Group, Customers, ISummary>(
        groups,
        () => new Customers(),
        newZeroSummary,
      );
    }).toThrowError('newZeroSummary function must be given with reducer function');
  });
});

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

describe('CollectionStore with errors', () => {
  const onStartWithError = async (itemId: string): Promise<IState> => {
    if (itemId === 'B') {
      throw new Error('B-group failed');
    }
    return {
      customers: [
        { name: 'Bender', email: 'bender.rodriguez@futurama.co' },
        { name: 'Leela', email: 'turanga.leela@futurama.co' },
        { name: 'Fry', email: 'phillip.j.fry@futurama.co' },
      ],
    };
  };

  class CustomersWithError extends SimpleStore<IState, null> {
    constructor() {
      super(newZeroState, onStartWithError);
    }
  }

  const collection = new CollectionStore<Group, CustomersWithError, null>(
    groups,
    () => new CustomersWithError(),
  );

  let called = 0;
  let started = false;
  let error = '';

  collection.subscribe(() => {
    called++;
    if (collection.started) {
      started = true;
    }
    if (collection.error) {
      error = collection.error;
    }
  }, 'test');

  it('should capture any error', async () => {
    collection.spawnStartAll();
    while (!started && !error) {
      await sleep(50);
    }
    expect(called).toBe(2);
    expect(error).toBe('B-group failed');
    expect(collection.stores.A.state.customers).toStrictEqual([
      { name: 'Bender', email: 'bender.rodriguez@futurama.co' },
      { name: 'Leela', email: 'turanga.leela@futurama.co' },
      { name: 'Fry', email: 'phillip.j.fry@futurama.co' },
    ]);
    expect(collection.stores.B.state.customers).toBeNull();
    expect(collection.stores.C.state.customers).toStrictEqual([
      { name: 'Bender', email: 'bender.rodriguez@futurama.co' },
      { name: 'Leela', email: 'turanga.leela@futurama.co' },
      { name: 'Fry', email: 'phillip.j.fry@futurama.co' },
    ]);
  });
});

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

describe('CollectionStore with no summary', () => {
  const onStartWithError = async (_: string): Promise<IState> => {
    return {
      customers: [{ name: 'Bender', email: 'bender.rodriguez@futurama.co' }],
    };
  };

  class CustomersWithError extends SimpleStore<IState, null> {
    constructor() {
      super(newZeroState, onStartWithError);
    }
  }

  const collection = new CollectionStore<Group, CustomersWithError, null>(
    groups,
    () => new CustomersWithError(),
  );

  let called = 0;
  let started = false;

  collection.subscribe(() => {
    called++;
    if (collection.started) {
      started = true;
    }
  }, 'test');

  it('should load data but not call summary', async () => {
    collection.spawnStartAll();
    while (!started) {
      await sleep(50);
    }
    expect(called).toBe(2);
    expect(collection.stores.A.state.customers).toStrictEqual([
      { name: 'Bender', email: 'bender.rodriguez@futurama.co' },
    ]);
    expect(collection.stores.B.state.customers).toStrictEqual([
      { name: 'Bender', email: 'bender.rodriguez@futurama.co' },
    ]);
    expect(collection.stores.C.state.customers).toStrictEqual([
      { name: 'Bender', email: 'bender.rodriguez@futurama.co' },
    ]);
    expect(collection.summary).toBeNull();
  });
});
