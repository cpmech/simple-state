# Simple reactive state management for UIs (frontends)

This project implements a very simple approach to manage state in user interfaces written in {Java,Type}Script.

The simple approach uses the concept of **observers** to notify listeners of any change in state data.

## SimpleStore

The main definition is a class named `SimpleStore` that needs to be extended before use. This can be done in six steps:

1. define the state interface
2. define the summary interface
3. define a function to generate a blank state
4. define a callback function to load state data
5. define a callback function to make a summary out of state data
6. extend the SimpleStore class; it may have any additional members

Then the UI (frontend) can use the store like so:

```typescript
const store = new User();

const unsubscribe = store.subscribe(() => {
  if (store.ready) {
    console.log('...not ready yet...');
  }
}, 'the-name-of-the-observer-goes-here');

store.load('some-id-goes-here');

unsubscribe();
```

The six steps above are illustrated in `examples/example01.ts` and shown below:

```typescript
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

// 5. define a callback function to make a summary out of state data
const onSummary = (state: IState): ISummary => ({
  accidents: state.name === 'Bender' ? 10 : 1,
});

// 6. extend the SimpleStore class; it may have any additional members
class User extends SimpleStore<IState, ISummary> {
  constructor() {
    super(newZeroState, onLoad, onSummary);
  }
  get username(): string {
    return this.state.name;
  }
}
```

## CollectionStore

TODO
