import { Indexable } from "./Indexable";
import { Token } from "./Token";

export class MontyDict implements Indexable {
  isIndexable: true = true;
  private map: Map<any, any>;

  constructor(map: Map<any, any>) {
    this.map = map;
  }

  indexGet(_bracket: Token, key: any): any {
    return this.map.get(key);
  }

  indexSet(_bracket: Token, key: any, value: any) {
    return this.map.set(key, value);
  }

  indexLength(): number {
    return this.map.size;
  }
}
