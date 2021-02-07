import { sleep, setElog } from '@cpmech/basic';
import { SimpleStore } from '../SimpleStore';
import { IObserver, IQueryFunction } from '../types';
import { GraphQLClient } from 'graphql-request';

setElog(false);

jest.setTimeout(1000);

interface IState {
  name: string;
  email: string;
}

const newZeroState = (): IState => ({
  name: '',
  email: '',
});

interface ISummary {
  accidents: number;
}

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

describe('SimpleStore', () => {
  let counter = 0;

  const onLoad = async (_: IQueryFunction, itemId: string): Promise<IState> => {
    counter++;
    if (itemId === 'leela') {
      return {
        name: 'Leela',
        email: 'turanga.leela@futurama.co',
      };
    }
    return {
      name: 'Bender',
      email: 'bender.rodriguez@futurama.co',
    };
  };

  const onSummary = (state: IState): ISummary => ({
    accidents: state.name === 'Bender' ? 10 : 1,
  });

  class User extends SimpleStore<IState, ISummary> {
    constructor() {
      super(newZeroState, onLoad, onSummary);
    }
    get username(): string {
      return this.state.name;
    }
    tryQuery = async () => {
      const { err } = await this.query('query { version }');
      return err;
    };
    tryMutation = async () => {
      const { err } = await this.mutation('mutation { setVersion(input: "v0.1.0") }');
      return err;
    };
  }

  const store = new User();

  let called = 0;
  let ready = false;

  const unsubscribe = store.subscribe(() => {
    called++;
    if (store.ready) {
      ready = true;
    }
  }, 'test');

  it('should initialize the store', async () => {
    expect(store.error).toBe('');
    expect(store.ready).toBe(false);
    expect(store.state).toStrictEqual({ name: '', email: '' });
    expect(store.summary).toBeNull();
    expect(store.username).toBe('');
  });

  it('should load and notify the observer', async () => {
    expect(called).toBe(0);
    expect(ready).toBe(false);
    store.load('bender');
    while (!ready) {
      await sleep(50);
    }
    expect(called).toBe(2); // ready=false, then true
    expect(counter).toBe(1);
    expect(store.error).toBe('');
    expect(store.ready).toBe(true);
    expect(store.state).toStrictEqual({ name: 'Bender', email: 'bender.rodriguez@futurama.co' });
    expect(store.summary).toStrictEqual({ accidents: 10 });
    expect(store.username).toBe('Bender');
  });

  it('should not load again', async () => {
    expect(called).toBe(2);
    expect(ready).toBe(true);
    store.load('leela', false);
    ready = false;
    let i = 0;
    while (!ready && i < 5) {
      await sleep(50);
      i++;
    }
    expect(called).toBe(2); // never called again
    expect(ready).toBe(false);
    expect(counter).toBe(1);
    expect(store.error).toBe('');
    expect(store.ready).toBe(true);
    expect(store.state).toStrictEqual({ name: 'Bender', email: 'bender.rodriguez@futurama.co' });
    expect(store.summary).toStrictEqual({ accidents: 10 });
    expect(store.username).toBe('Bender');
  });

  it('should load again and notify the observer', async () => {
    expect(called).toBe(2);
    expect(ready).toBe(false);
    store.load('leela', true);
    while (!ready) {
      await sleep(50);
    }
    expect(called).toBe(4); // ready=false, then true
    expect(counter).toBe(2);
    expect(store.error).toBe('');
    expect(store.ready).toBe(true);
    expect(store.state).toStrictEqual({ name: 'Leela', email: 'turanga.leela@futurama.co' });
    expect(store.summary).toStrictEqual({ accidents: 1 });
    expect(store.username).toBe('Leela');
  });

  it('should compute summary', async () => {
    expect(called).toBe(4);
    store.doSummary();
    ready = false;
    while (!ready) {
      await sleep(50);
    }
    expect(store.summary).toStrictEqual({ accidents: 1 });
    expect(called).toBe(6); // ready=false, then true
  });

  it('should reset state', async () => {
    expect(called).toBe(6);
    expect(store.state).toStrictEqual({ name: 'Leela', email: 'turanga.leela@futurama.co' });
    expect(store.summary).toStrictEqual({ accidents: 1 });
    store.reset();
    ready = false;
    while (!ready) {
      await sleep(50);
    }
    expect(store.state).toStrictEqual({ name: '', email: '' });
    expect(store.summary).toBeNull();
    expect(called).toBe(8);
  });

  it('should handle an observer that turned null', async () => {
    expect(called).toBe(8);
    store.subscribe((null as unknown) as IObserver, 'temporary'); // <<< force null (unusual)
    ready = false;
    store.load('bender', true);
    while (!ready) {
      await sleep(50);
    }
    expect(called).toBe(10);
    expect(store.state).toStrictEqual({ name: 'Bender', email: 'bender.rodriguez@futurama.co' });
  });

  it('should ignore null api in query', async () => {
    const res = await store.tryQuery();
    expect(res).toBe('GraphQL API is not available');
  });

  it('should ignore null api in mutation', async () => {
    const res = await store.tryMutation();
    expect(res).toBe('GraphQL API is not available');
  });

  it('should unsubscribe observer', async () => {
    unsubscribe();
    expect(called).toBe(10);
    await store.load('leela', true);
    expect(called).toBe(10);
  });
});

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

describe('SimpleStore with errors', () => {
  const onLoad = async (_: IQueryFunction, itemId: string): Promise<IState> => {
    throw new Error('STOP');
  };

  const onSummary = (state: IState): ISummary => {
    throw new Error('FAIL');
  };

  class User extends SimpleStore<IState, ISummary> {
    constructor() {
      super(newZeroState, onLoad, onSummary);
    }
  }

  const store = new User();

  let called = 0;
  let ready = false;
  let error = '';

  store.subscribe(() => {
    called++;
    if (store.ready) {
      ready = true;
    }
    if (store.error) {
      error = store.error;
    }
  }, 'test');

  it('should handle error onLoad', async () => {
    expect(called).toBe(0);
    expect(ready).toBe(false);
    store.load('bender');
    while (error === '') {
      await sleep(50);
    }
    expect(called).toBe(2);
    expect(error).toBe('STOP');
  });

  it('should handle error on doSummary', async () => {
    expect(called).toBe(2);
    store.doSummary();
    error = '';
    while (error === '') {
      await sleep(50);
    }
    expect(called).toBe(4);
    expect(error).toBe('FAIL');
  });
});

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

describe('SimpleStore without summary', () => {
  const onLoad = async (_: IQueryFunction, itemId: string): Promise<IState> => {
    return {
      name: 'Bender',
      email: 'bender.rodriguez@futurama.co',
    };
  };

  class User extends SimpleStore<IState, null> {
    constructor() {
      super(newZeroState, onLoad);
    }
  }

  const store = new User();

  let called = 0;
  let ready = false;

  store.subscribe(() => {
    called++;
    if (store.ready) {
      ready = true;
    }
  }, 'test');

  it('should load without calling summary', async () => {
    store.load('bender');
    while (!ready) {
      await sleep(50);
    }
    expect(called).toBe(2); // ready=false, then true
    expect(store.state).toStrictEqual({ name: 'Bender', email: 'bender.rodriguez@futurama.co' });
    expect(store.summary).toBeNull();
  });

  it('should do nothing in doSummary call', async () => {
    expect(called).toBe(2);
    store.doSummary();
    expect(called).toBe(2);
  });
});

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

describe('SimpleStore with (mock) GraphQL API', () => {
  const onLoad = async (query: IQueryFunction, itemId: string): Promise<IState> => {
    const { res, err } = await query(`query {
      user(itemId: "${itemId}") {
        name
        email
      }
    }`);
    if (err) {
      throw new Error(err);
    }
    return res.user;
  };

  const api = new GraphQLClient('http://localhost:4444');

  class User extends SimpleStore<IState, null> {
    constructor() {
      super(newZeroState, onLoad, undefined, api);
    }
    changeName = async (itemId: string, name: string) => {
      this.begin();
      const { res, err } = await this.mutation(
        `mutation M($input: NameInput!) {
          setName(itemId: "${itemId}", input: $input) {
            name
            email
          }
        }`,
        { input: { name } },
      );
      if (err) {
        return this.end(err);
      }
      this.state = res.setName;
      this.end();
    };
  }

  const store = new User();

  let called = 0;
  let ready = false;
  let error = '';

  store.subscribe(() => {
    called++;
    if (store.ready) {
      ready = true;
    }
    if (store.error) {
      error = store.error;
    }
  }, 'test');

  it('should fetch (mock) data', async () => {
    const data = {
      user: {
        name: 'Bender',
        email: 'bender.rodriguez@futurama.co',
      },
    };

    // TODO
    const response = { body: { data } };

    store.load('bender');
    while (!ready) {
      await sleep(50);
    }
    expect(called).toBe(2); // ready=false, then true
    expect(store.state).toStrictEqual({
      name: 'Bender',
      email: 'bender.rodriguez@futurama.co',
    });
  });

  it('should handle error on queries', async () => {
    // TODO
    const response = { body: {} };

    store.load('leela');
    while (error === '') {
      await sleep(50);
    }
    expect(called).toBe(4); // ready=false, then true
    expect(error).toBe(
      'GraphQL Error (Code: 200): {"response":{"status":200},"request":{"query":"query {\\n      user(itemId: \\"leela\\") {\\n        name\\n        email\\n      }\\n    }"}}',
    );
  });

  it('should call mutation', async () => {
    const data = {
      setName: {
        name: 'Benderio',
        email: 'bender.rodriguez@futurama.co',
      },
    };

    // TODO
    const response = { body: { data } };

    ready = false;
    store.changeName('bender', 'Benderio');
    while (!ready) {
      await sleep(50);
    }
    expect(called).toBe(6); // ready=false, then true
    expect(store.state).toStrictEqual({
      name: 'Benderio',
      email: 'bender.rodriguez@futurama.co',
    });
  });

  it('should handle error on mutations', async () => {
    // TODO
    const response = { body: {} };

    error = '';
    store.changeName('bender', 'Benderio');
    while (error === '') {
      await sleep(50);
    }
    expect(called).toBe(8); // ready=false, then true
    expect(error).toBe(
      'GraphQL Error (Code: 200): {"response":{"status":200},"request":{"query":"mutation M($input: NameInput!) {\\n          setName(itemId: \\"bender\\", input: $input) {\\n            name\\n            email\\n          }\\n        }","variables":{"input":{"name":"Benderio"}}}}',
    );
  });

  it('should be able to clear error', async () => {
    store.clearError();
    while (store.error) {
      await sleep(50);
    }
    expect(store.error).toBe('');
    store.clearError();
    expect(store.error).toBe('');
  });
});
