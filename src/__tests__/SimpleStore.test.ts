import { sleep } from '@cpmech/basic';
import { SimpleStore } from '../SimpleStore';
import { IObserver } from '../types';

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

describe('SimpleStore', () => {
  let counter = 0;

  const onLoad = async (): Promise<IState> => {
    counter++;
    if (counter > 1) {
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

  const onSummary = (group: 'Users', state: IState): ISummary => ({
    accidents: state.name === 'Bender' ? 10 : 1,
  });

  class User extends SimpleStore<'Users', IState, ISummary> {
    constructor() {
      super('Users', newZeroState, onLoad, onSummary);
    }
    get username(): string {
      return this.state.name;
    }
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
    expect(store.group).toBe('Users');
    expect(store.state).toStrictEqual({ name: '', email: '' });
    expect(store.summary).toBeNull();
    expect(store.username).toBe('');
  });

  it('should load and notify the observer', async () => {
    expect(called).toBe(0);
    expect(ready).toBe(false);
    store.load();
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
    store.load();
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
    store.load(true);
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
    store.load(true);
    while (!ready) {
      await sleep(50);
    }
    expect(called).toBe(10);
  });

  it('should unsubscribe observer', async () => {
    unsubscribe();
    expect(called).toBe(10);
    await store.load(true);
    expect(called).toBe(10);
  });
});

///////////////////////////////////////////////////////////////////////////////////////////////////

describe('SimpleStore with errors', () => {
  const onLoad = async (): Promise<IState> => {
    throw new Error('STOP');
  };

  const onSummary = (group: 'Users', state: IState): ISummary => {
    throw new Error('FAIL');
  };

  class User extends SimpleStore<'Users', IState, ISummary> {
    constructor() {
      super('Users', newZeroState, onLoad, onSummary);
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
    store.load();
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

describe('SimpleStore without summary', () => {
  const onLoad = async (): Promise<IState> => {
    return {
      name: 'Bender',
      email: 'bender.rodriguez@futurama.co',
    };
  };

  class User extends SimpleStore<'Users', IState, null> {
    constructor() {
      super('Users', newZeroState, onLoad);
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

  it('should load without calling summary', async () => {
    store.load();
    while (!ready) {
      await sleep(50);
    }
    expect(called).toBe(2); // ready=false, then true
    expect(store.state).toStrictEqual({ name: 'Bender', email: 'bender.rodriguez@futurama.co' });
    expect(store.summary).toBeNull();
  });

  it('should do nothing in doSummary call', async () => {
    expect(called).toBe(2);
    await store.doSummary();
    expect(called).toBe(2);
  });
});
