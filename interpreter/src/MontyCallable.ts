export interface MontyCallable {
  isMontyCallable: true;
  call(arguments_: any[]): any;
  arity(): number | "variadic";
}

export function isMontyCallable(a: any): a is MontyCallable {
  return a && a.isMontyCallable;
}
