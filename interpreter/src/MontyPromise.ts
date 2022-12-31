export class MontyPromise<T> {
  readonly promise: Promise<T>;

  constructor(promise: Promise<T>) {
    this.promise = promise;
  }
}
