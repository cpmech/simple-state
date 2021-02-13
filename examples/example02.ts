import { CollectionStore, SimpleStore } from '../src';

/////////////////////////////////////////////////////////////////////////////////
// begin: this part is almost identical to example 01 ///////////////////////////
/////////////////////////////////////////////////////////////////////////////////

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
const newZeroState = (): IState => ({ name: '', email: '' });

// 4. define a callback function to load state data
// >>> slightly different than in example01 <<<
const onStart = async (group: string): Promise<IState> => {
  if (group === 'RELIABLE') {
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

/////////////////////////////////////////////////////////////////////////////////
// end: this part is almost identical to example 01 /////////////////////////////
/////////////////////////////////////////////////////////////////////////////////

// 7. define the name of user groups
type Group = 'RELIABLE' | 'UNRELIABLE';
const groups: Group[] = ['RELIABLE', 'UNRELIABLE'];

// 8. define a function to collect all summary (reducer)
const reducer = (acc: ISummary, store: User): ISummary => {
  if (store.summary) {
    return {
      accidents: acc.accidents + store.summary.accidents,
    };
  } else {
    return acc;
  }
};

// 9. defina a function to generate a blank summary
const newZeroSummary = (): ISummary => ({ accidents: 0 });

// run the example
(async () => {
  const collection = new CollectionStore<Group, User, ISummary>(
    groups,
    () => new User(),
    newZeroSummary,
    reducer,
  );

  let called = 0;
  let ready = false;

  const unsubscribe = collection.subscribe(() => {
    called++;
    if (collection.ready) {
      ready = true;
      console.log('RELIABLE users:');
      console.log(collection.stores.RELIABLE.state); // we may read state data
      console.log('UNRELIABLE users:');
      console.log(collection.stores.UNRELIABLE.state); // we may read state data
    } else {
      console.log('...not ready yet...');
    }
  }, 'example02');

  collection.spawnLoadAll();
  await sleep(500);

  console.log(`called = ${called}`);
  console.log(`ready = ${ready}`);
  console.log(`accidents = ${collection.summary?.accidents}`);

  unsubscribe();
})();

// OUTPUT:
//   ...not ready yet...
//   RELIABLE users:
//   { name: 'Leela', email: 'turanga.leela@futurama.co' }
//   UNRELIABLE users:
//   { name: 'Bender', email: 'bender.rodriguez@futurama.co' }
//   called = 2
//   ready = true
//   accidents = 11
