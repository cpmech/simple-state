import { SimpleStore } from '../src';

// auxiliary function
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// define the state interface
interface IState {
  data: {
    email: string;
  };
}

// define a function to generate a blank state
const newZeroState = (): IState => ({
  data: { email: '' },
});

// extend the SimpleStore class; it may have any additional members
class Store extends SimpleStore<IState, null> {
  constructor() {
    super(newZeroState);
  }

  load = async () => {
    this.begin();
    this.state.data.email = 'my.email@gmail.com';
    this.end();
  };
}

// run the example
(async () => {
  const store = new Store();

  let called = 0;
  let ready = false;

  const unsubscribe = store.subscribe(() => {
    called++;
    if (store.started) {
      ready = true;
    } else {
      console.log('...not ready yet...');
    }
  }, 'example00');

  store.load();
  await sleep(500);

  console.log(`called = ${called}`);
  console.log(`ready = ${ready}`);
  console.log('state =', store.state);

  unsubscribe();
})();

// OUTPUT:
//   ...not ready yet...
//   called = 2
//   ready = true
//   state = { data: { email: 'my.email@gmail.com' } }
