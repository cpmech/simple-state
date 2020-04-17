import { sleep } from '@cpmech/basic';
import { SimpleStore } from '../SimpleStore';

jest.setTimeout(200);

interface IState {
  name: string;
  email: string;
}

const newZeroState = (): IState => ({
  name: '',
  email: '',
});

class User extends SimpleStore<'Users', IState, null> {
  constructor() {
    super(
      'Users',
      newZeroState,
      async (): Promise<IState> => {
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
  it('should initialize the store', async () => {
    const store = new User();

    expect(store.error).toBe('');
    expect(store.loading).toBe(false);
    expect(store.ready).toBe(false);
    expect(store.group).toBe('Users');
    expect(store.state).toStrictEqual({ name: '', email: '' });
    expect(store.summary).toBeNull();
    expect(store.username).toBe('');

    let ready = false;
    const unsubscribe = store.subscribe(() => {
      if (store.ready) {
        ready = true;
      }
    }, 'test');

    store.load();

    while (!ready) {
      await sleep(50);
    }

    unsubscribe();

    expect(store.error).toBe('');
    expect(store.loading).toBe(false);
    expect(store.ready).toBe(true);
    expect(store.state).toStrictEqual({ name: 'Bender', email: 'bender.rodriguez@futurama.co' });
    expect(store.username).toBe('Bender');
  });
});
