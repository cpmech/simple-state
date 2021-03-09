# Simple reactive state management for frontends

This project implements a very simple approach to manage state in user interfaces written in TypeScript.

The simple approach uses the concept of **observers** to notify listeners of any change in state data.

We have designed a `SimpleStore` class to hold **state** and handle notifications using **actions**.

The `SimpleStore` class needs to be extended before use and this can be done in six steps:

1. define the state interface (e.g. `IState`)
2. define the summary interface (to perform post-calculations "reducer" based on loaded data; e.g. `ISummary`)
3. define a function to generate a blank state (e.g. `newZeroState`)
4. [optional] define a callback function to load initla state data (from server; e.g. `onStart`)
5. [optional] define a callback function to make a summary out of state data ("reducer", e.g. `onSummary`)
6. extend the SimpleStore class

This is an example of how to extend `SimpleStore`:

```typescript
class User extends SimpleStore<Action, IState, null> {
  constructor() {
    super(actionNames, newZeroState);
  }
  loadData = async (itemId: string) => {
    await this.updateState('loadData', async () => {
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
```

Then the frontend application could use the store like so:

```typescript
// TODO
```

## Examples

See the `examples` directory. You may run them as follows:

```bash
npm run --silent tsnode -- examples/example00.ts
```
