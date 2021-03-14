import { SimpleStore } from '../src';

// auxiliary function
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// define possible actions
type Action = 'loadData' | 'clearState';
const actionNames: Action[] = ['loadData', 'clearState'];

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
class Store extends SimpleStore<Action, IState, null> {
  constructor() {
    super(actionNames, newZeroState);
  }

  loadData = async () => {
    this.updateState('loadData', async () => {
      this.state.data.email = 'my.email@gmail.com';
    });
  };
}

// run the example
(async () => {
  const store = new Store();

  let called = 0;
  let ready = false;

  const unsubscribe = store.subscribe(() => {
    called++;
    if (store.actions.loadData.successCount > 0) {
      ready = true;
      console.log('...ready...');
      console.log('state =', store.state); // we may read state data
    } else {
      console.log('...not ready yet...');
    }
  }, 'example00');

  store.loadData();
  await sleep(500);

  console.log(`called = ${called}`);
  console.log(`ready = ${ready}`);
  console.log('state =', store.state);

  unsubscribe();
})();

// ...not ready yet...
// ...ready...
// state = { data: { email: 'my.email@gmail.com' } }
// called = 2
// ready = true
// state = { data: { email: 'my.email@gmail.com' } }
