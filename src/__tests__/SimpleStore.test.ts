import { sleep } from '@cpmech/basic';
import { SimpleStore } from '../SimpleStore';

jest.setTimeout(500);

interface IState {
  name: string;
  email: string;
}

const newZeroState = (): IState => ({
  name: '',
  email: '',
});

let counter = 0;

class User extends SimpleStore<'Users', IState, null> {
  constructor() {
    super(
      'Users',
      newZeroState,
      async (): Promise<IState> => {
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
      },
    );
  }
  get username(): string {
    return this.state.name;
  }
}

describe('SimpleStore', () => {
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
    expect(store.username).toBe('Leela');
  });

  it('should unsubscribe observer', async () => {
    unsubscribe();
    expect(called).toBe(4);
    await store.load(true);
    expect(called).toBe(4);
  });
});
