import { SimpleStore } from '../src';

// auxiliary function
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// define possible actions
type Action = 'loadData' | 'clearState';
const actionNames: Action[] = ['loadData', 'clearState'];

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

// 5. define a callback function to make a summary out of state data
const onSummary = async (state: IState): Promise<ISummary> => ({
  accidents: state.name === 'Bender' ? 10 : 1,
});

// 6. extend the SimpleStore class; it may have any additional members
class User extends SimpleStore<Action, IState, ISummary> {
  constructor() {
    super(actionNames, newZeroState, onSummary);
  }

  // 4. define a callback function to load state data
  loadData = async (itemId: string) => {
    this.updateState('loadData', async () => {
      if (itemId === 'leela') {
        this.state = {
          name: 'Leela',
          email: 'turanga.leela@futurama.co',
        };
      }
      this.state = {
        name: 'Bender',
        email: 'bender.rodriguez@futurama.co',
      };
    });
  };
}

// run the example
(async () => {
  const store = new User();

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
  }, 'example01');

  store.loadData('bender');
  await sleep(500);

  console.log(`called = ${called}`);
  console.log(`started = ${ready}`);
  console.log(`accidents = ${store.summary?.accidents}`);

  unsubscribe();
})();

// ...not ready yet...
// ...ready...
// state = { name: 'Bender', email: 'bender.rodriguez@futurama.co' }
// called = 2
// started = true
// accidents = 10
