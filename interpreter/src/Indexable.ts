import { Token } from "./Token";

export interface Indexable {
  isIndexable: true;
  indexGet(bracket: Token, key: any): any;
  indexSet(bracket: Token, key: any, value: any): any;
  indexLength(): number;
}

export function isIndexable(a: any): a is Indexable {
  return a && a.isIndexable;
}
