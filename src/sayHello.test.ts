import { sayHello } from './index';

describe('sayHello', () => {
  it('works', async () => {
    const res = await sayHello(false);
  });

  it('fails', async () => {
    await expect(sayHello(true)).rejects.toThrowError('will fail');
  });
});
