import { sleep, setElog } from '@cpmech/basic';
import { SimpleStore } from '../SimpleStore';
import { IObserver } from '../types';

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
  class User extends SimpleStore<IState, null> {
    constructor() {
      super(newZeroState);
    }

    load = async () => {
      this.notifyBeginReady();
      this.state.name = 'My Name';
      this.state.email = 'my.email@gmail.com';
      this.notifyEndReady();
    };
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

  it('should start', async () => {
    store.load();
    while (!ready) {
      await sleep(50);
    }
    expect(called).toBe(2); // ready=false, then true
    expect(store.state).toStrictEqual({ name: 'My Name', email: 'my.email@gmail.com' });
    expect(store.summary).toBeNull();
  });
});

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

describe('SimpleStore (onStart)', () => {
  let counter = 0;

  const onStart = async (itemId: string): Promise<IState> => {
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
      super(newZeroState, onStart, onSummary);
    }
    get username(): string {
      return this.state.name;
    }
    someAction() {
      this.notifyBeginReady();
      this.state.email = 'invalid';
      this.notifyEndReady();
    }
  }

  const store = new User();

  let called = 0;
  let started = false;
  let ready = false;

  const unsubscribe = store.subscribe(() => {
    called++;
    if (store.started) {
      started = true;
    }
    if (store.ready) {
      ready = true;
    }
  }, 'test');

  it('should initialize the store', async () => {
    expect(store.error).toBe('');
    expect(store.started).toBe(false);
    expect(store.ready).toBe(false);
    expect(store.state).toStrictEqual({ name: '', email: '' });
    expect(store.summary).toBeNull();
    expect(store.username).toBe('');
  });

  it('should load and notify the observer', async () => {
    expect(called).toBe(0);
    expect(started).toBe(false);
    expect(ready).toBe(false);
    store.doStart('bender');
    while (!started) {
      await sleep(50);
    }
    expect(called).toBe(2); // started=false, then true
    expect(counter).toBe(1);
    expect(store.error).toBe('');
    expect(store.started).toBe(true);
    expect(store.state).toStrictEqual({ name: 'Bender', email: 'bender.rodriguez@futurama.co' });
    expect(store.summary).toStrictEqual({ accidents: 10 });
    expect(store.username).toBe('Bender');
  });

  it('should not load again', async () => {
    expect(called).toBe(2);
    expect(started).toBe(true);
    expect(ready).toBe(false);
    store.doStart('leela', false);
    started = false;
    let i = 0;
    while (!started && i < 5) {
      await sleep(50);
      i++;
    }
    expect(called).toBe(2); // never called again
    expect(started).toBe(false);
    expect(counter).toBe(1);
    expect(store.error).toBe('');
    expect(store.started).toBe(true);
    expect(store.state).toStrictEqual({ name: 'Bender', email: 'bender.rodriguez@futurama.co' });
    expect(store.summary).toStrictEqual({ accidents: 10 });
    expect(store.username).toBe('Bender');
  });

  it('should load again and notify the observer', async () => {
    expect(called).toBe(2);
    expect(started).toBe(false);
    expect(ready).toBe(false);
    store.doStart('leela', true);
    while (!started) {
      await sleep(50);
    }
    expect(called).toBe(4); // started=false, then true
    expect(counter).toBe(2);
    expect(store.error).toBe('');
    expect(store.started).toBe(true);
    expect(store.state).toStrictEqual({ name: 'Leela', email: 'turanga.leela@futurama.co' });
    expect(store.summary).toStrictEqual({ accidents: 1 });
    expect(store.username).toBe('Leela');
  });

  it('should compute summary', async () => {
    expect(called).toBe(4);
    expect(ready).toBe(false);
    store.doSummary();
    started = false;
    while (!started) {
      await sleep(50);
    }
    expect(store.summary).toStrictEqual({ accidents: 1 });
    expect(called).toBe(6); // started=false, then true
  });

  it('should reset state', async () => {
    expect(called).toBe(6);
    expect(ready).toBe(false);
    expect(store.state).toStrictEqual({ name: 'Leela', email: 'turanga.leela@futurama.co' });
    expect(store.summary).toStrictEqual({ accidents: 1 });
    store.reset();
    started = false;
    while (!started) {
      await sleep(50);
    }
    expect(store.state).toStrictEqual({ name: '', email: '' });
    expect(store.summary).toBeNull();
    expect(called).toBe(8);
  });

  it('should handle an observer that turned null', async () => {
    expect(called).toBe(8);
    expect(ready).toBe(false);
    store.subscribe((null as unknown) as IObserver, 'temporary'); // <<< force null (unusual)
    started = false;
    store.doStart('bender', true);
    while (!started) {
      await sleep(50);
    }
    expect(called).toBe(10);
    expect(store.state).toStrictEqual({ name: 'Bender', email: 'bender.rodriguez@futurama.co' });
  });

  it('should notify based on the ready flag', async () => {
    expect(called).toBe(10);
    expect(ready).toBe(false);
    store.someAction();
    while (!ready) {
      await sleep(50);
    }
    expect(ready).toBe(true);
  });

  it('should unsubscribe observer', async () => {
    unsubscribe();
    expect(called).toBe(12);
    await store.doStart('leela', true);
    expect(called).toBe(12);
  });
});

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

describe('SimpleStore (onStart and errors)', () => {
  const onStart = async (itemId: string): Promise<IState> => {
    throw new Error('STOP');
  };

  const onSummary = (state: IState): ISummary => {
    throw new Error('FAIL');
  };

  class User extends SimpleStore<IState, ISummary> {
    constructor() {
      super(newZeroState, onStart, onSummary);
    }
  }

  const store = new User();

  let called = 0;
  let started = false;
  let error = '';

  store.subscribe(() => {
    called++;
    if (store.started) {
      started = true;
    }
    if (store.error) {
      error = store.error;
    }
  }, 'test');

  it('should handle error onStart', async () => {
    expect(called).toBe(0);
    expect(started).toBe(false);
    store.doStart('bender');
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

describe('SimpleStore (onStart and no summary)', () => {
  const onStart = async (itemId: string): Promise<IState> => {
    return {
      name: 'Bender',
      email: 'bender.rodriguez@futurama.co',
    };
  };

  class User extends SimpleStore<IState, null> {
    constructor() {
      super(newZeroState, onStart);
    }
  }

  const store = new User();

  let called = 0;
  let started = false;

  store.subscribe(() => {
    called++;
    if (store.started) {
      started = true;
    }
  }, 'test');

  it('should load without calling summary', async () => {
    store.doStart('bender');
    while (!started) {
      await sleep(50);
    }
    expect(called).toBe(2); // started=false, then true
    expect(store.state).toStrictEqual({ name: 'Bender', email: 'bender.rodriguez@futurama.co' });
    expect(store.summary).toBeNull();
  });

  it('should do nothing in doSummary call', async () => {
    expect(called).toBe(2);
    store.doSummary();
    expect(called).toBe(2);
  });
});
