export const sayHello = async (doFail: boolean) => {
  if (doFail) {
    throw new Error('will fail');
  }
  return 'Hello World!';
};
