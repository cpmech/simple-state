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

const onLoad = async (group: Group): Promise<IState> => {
  await sleep(50 + Math.random() * 100);
  counter++;
  return {
    customers: [
      { name: 'Bender', email: 'bender.rodriguez@futurama.co' },
      { name: 'Leela', email: 'turanga.leela@futurama.co' },
      { name: 'Fry', email: 'phillip.j.fry@futurama.co' },
    ],
  };
};

const onSummary = (group: Group, state: IState): ISummary => {
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
    (group: Group) => new Customers(group),
    newZeroSummary,
    reducer,
  );

  let called = 0;
  let ready = false;

  const unsubscribe = collection.subscribe(() => {
    called++;
    if (collection.ready) {
      ready = true;
    }
  }, 'test');

  it('should initialize all stores', async () => {
    expect(collection.groups).toEqual(['A', 'B', 'C']);
    expect(collection.error).toBe('');
    expect(collection.ready).toBe(false);
    expect(collection.stores.A.state.customers).toBeNull();
    expect(collection.stores.B.state.customers).toBeNull();
    expect(collection.stores.C.state.customers).toBeNull();
  });

  it('should load and notify the observer', async () => {
    expect(counter).toBe(0);
    collection.spawnLoadAll();
    while (!ready) {
      await sleep(50);
    }
    expect(called).toBe(2); // ready=false, then true
    expect(counter).toBe(3);
    expect(collection.ready).toBe(true);
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
    ready = false;
    collection.spawnLoadAll(true);
    while (!ready) {
      await sleep(50);
    }
    expect(called).toBe(4); // ready=false, then true
    expect(counter).toBe(6);
    expect(collection.ready).toBe(true);
    expect(collection.stores.A.state.customers).toStrictEqual([
      { name: 'Bender', email: 'bender.rodriguez@futurama.co' },
      { name: 'Leela', email: 'turanga.leela@futurama.co' },
      { name: 'Fry', email: 'phillip.j.fry@futurama.co' },
    ]);
    expect(collection.stores.B.state.customers).toStrictEqual([
      { name: 'Bender', email: 'bender.rodriguez@futurama.co' },
      { name: 'Leela', email: 'turanga.leela@futurama.co' },
      { name: 'Fry', email: 'phillip.j.fry@futurama.co' },
    ]);
    expect(collection.stores.C.state.customers).toStrictEqual([
      { name: 'Bender', email: 'bender.rodriguez@futurama.co' },
      { name: 'Leela', email: 'turanga.leela@futurama.co' },
      { name: 'Fry', email: 'phillip.j.fry@futurama.co' },
    ]);
    expect(collection.summary).toEqual({ android: 4, ios: 4, web: 8 });
    await sleep(200);
    expect(collection.summary).toEqual({ android: 4, ios: 4, web: 8 });
  });

  it('should handle an observer that turned null', async () => {
    expect(called).toBe(4);
    collection.subscribe((null as unknown) as IObserver, 'temporary'); // <<< force null (unusual)
    ready = false;
    collection.spawnLoadAll(true);
    while (!ready) {
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
  });

  it('should unsubscribe observer', async () => {
    unsubscribe();
    expect(called).toBe(6);
    expect(counter).toBe(9);
    collection.spawnLoadAll(true);
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
        (group: Group) => new Customers(group),
        undefined,
        reducer,
      );
    }).toThrowError('newZeroSummary function must be given with reducer function');

    expect(() => {
      new CollectionStore<Group, Customers, ISummary>(
        groups,
        (group: Group) => new Customers(group),
        newZeroSummary,
      );
    }).toThrowError('newZeroSummary function must be given with reducer function');
  });
});

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

describe('CollectionStore with errors', () => {
  const onLoadWithError = async (group: Group): Promise<IState> => {
    if (group === 'B') {
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

  class CustomersWithError extends SimpleStore<Group, IState, null> {
    constructor(group: Group) {
      super(group, newZeroState, onLoadWithError);
    }
  }

  const collection = new CollectionStore<Group, CustomersWithError, null>(
    groups,
    (group: Group) => new CustomersWithError(group),
  );

  let called = 0;
  let ready = false;
  let error = '';

  collection.subscribe(() => {
    called++;
    if (collection.ready) {
      ready = true;
    }
    if (collection.error) {
      error = collection.error;
    }
  }, 'test');

  it('should capture any error', async () => {
    collection.spawnLoadAll();
    while (!ready && !error) {
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
  const onLoadWithError = async (group: Group): Promise<IState> => {
    return {
      customers: [{ name: 'Bender', email: 'bender.rodriguez@futurama.co' }],
    };
  };

  class CustomersWithError extends SimpleStore<Group, IState, null> {
    constructor(group: Group) {
      super(group, newZeroState, onLoadWithError);
    }
  }

  const collection = new CollectionStore<Group, CustomersWithError, null>(
    groups,
    (group: Group) => new CustomersWithError(group),
  );

  let called = 0;
  let ready = false;

  collection.subscribe(() => {
    called++;
    if (collection.ready) {
      ready = true;
    }
  }, 'test');

  it('should load data but not call summary', async () => {
    collection.spawnLoadAll();
    while (!ready) {
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
