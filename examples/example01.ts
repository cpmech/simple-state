import { SimpleStore } from '../src';

// auxiliary function
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 1. define the state interface
interface IState {
  name: string;
  email: string;
}

// 2. define the summary interface
interface ISummary {
  accidents: number;
}

// 3. define a function to generate a blank state
const newZeroState = (): IState => ({
  name: '',
  email: '',
});

// 4. define a callback function to load state data
const onStart = async (itemId: string): Promise<IState> => {
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

// 5. define a callback function to make a summary out of state data
const onSummary = (state: IState): ISummary => ({
  accidents: state.name === 'Bender' ? 10 : 1,
});

// 6. extend the SimpleStore class; it may have any additional members
class User extends SimpleStore<IState, ISummary> {
  constructor() {
    super(newZeroState, onStart, onSummary);
  }
  get username(): string {
    return this.state.name;
  }
}

// run the example
(async () => {
  const store = new User();

  let called = 0;
  let ready = false;

  const unsubscribe = store.subscribe(() => {
    called++;
    if (store.started) {
      ready = true;
      console.log(store.state); // we may read state data
    } else {
      console.log('...not ready yet...');
    }
  }, 'example01');

  store.start('bender');
  await sleep(500);

  console.log(`called = ${called}`);
  console.log(`ready = ${ready}`);
  console.log(`accidents = ${store.summary?.accidents}`);

  unsubscribe();
})();

// OUTPUT:
//   ...not ready yet...
//   { name: 'Bender', email: 'bender.rodriguez@futurama.co' }
//   called = 2
//   ready = true
