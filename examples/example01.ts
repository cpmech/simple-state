import { SimpleStore } from '../src';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

const onLoad = async (itemId: string): Promise<IState> => {
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
}

(async () => {
  const store = new User();

  let called = 0;
  let ready = false;

  const unsubscribe = store.subscribe(() => {
    called++;
    if (store.ready) {
      ready = true;
    }
  }, 'example');

  store.load('bender');
  await sleep(500);

  console.log(called);

  unsubscribe();
})();
