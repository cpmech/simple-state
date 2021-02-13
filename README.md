# Simple reactive state management for frontends

This project implements a very simple approach to manage state in user interfaces written in {Java,Type}Script.

The simple approach uses the concept of **observers** to notify listeners of any change in state data.

We have designed a `SimpleStore` class and a `CollectionStore` class that wraps `SimpleStore` and allows multiple data to be loaded asynchronously.

The `SimpleStore` class needs to be extended before use and this can be done in six steps:

1. define the state interface (e.g. `IState`)
2. define the summary interface (to perform post-calculations based on loaded data; e.g. `ISummary`)
3. define a function to generate a blank state (e.g. `newZeroState`)
4. define a callback function to load state data (e.g. `onStart`)
5. define a callback function to make a summary out of state data (e.g. `onSummary`)
6. extend the SimpleStore class; it may have any additional members (e.g. `User`)

The `CollectionStore` can be instantiated direclty, but requires another three steps:

7. define the name of data groups (e.g. user groups such as ADMIN, CUSTOMER, etc.) (e.g. `Group`)
8. define a function to collect all summary (e.g. `reducer`)
9. defina a function to generate a blank summary (e.g. `newZeroSummary`)

This is how we extend the `SimpleStore`:

```typescript
class User extends SimpleStore<IState, ISummary> {
  constructor() {
    super(newZeroState, onStart, onSummary);
  }
  get username(): string {
    return this.state.name;
  }
}
```

And this is how we instantiate a `CollectionStore`:

```typescript
const collection = new CollectionStore<Group, User, ISummary>(
  groups,
  () => new User(),
  newZeroSummary,
  reducer,
);
```

Then the frontend can use the stores like so:

```typescript
const store = new User();

const unsubscribe = store.subscribe(() => {
  if (store.ready) {
    console.log('...not ready yet...');
  }
}, 'the-name-of-the-observer-goes-here');

store.load('some-id-goes-here');

// ... do something

unsubscribe();
```

Or, using the "collection":

```typescript
const unsubscribe = collection.subscribe(() => {
  if (collection.ready) {
    console.log(collection.stores.ADMIN.state); // we may read state data
    console.log(collection.stores.CUSTOMER.state); // we may read state data
  } else {
    console.log('...not ready yet...');
  }
}, 'the-name-of-this-another-observer-goes-here');

collection.spawnLoadAll(); // load all data asynchronously.

// ... do something

unsubscribe();
```

## Examples

See `examples` directory. You may run them as follows:

```bash
yarn tsnode examples/example01.ts
```

Or:

```bash
yarn tsnode examples/example02.ts
```
