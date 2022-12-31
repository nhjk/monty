import { Indexable } from "./Indexable";
import { isMontyCallable, MontyCallable } from "./MontyCallable";
import { MontyClass } from "./MontyClass";
import { MontyTypeError } from "./MontyError";
import { MontyInstance } from "./MontyInstance";
import { Token } from "./Token";

export class ObjectFFI extends MontyInstance {
  object: any;
  cache: Map<string, MontyCallable | MontyInstance> = new Map();

  constructor(object: any) {
    super(new MontyClass("ffi", new Map(), undefined));
    this.object = object;
  }

  get(name: Token): any {
    const cached = this.cache.get(name.lexeme);
    if (cached) return cached;
    const x = this.wrap(this.object[name.lexeme]);
    this.cache.set(name.lexeme, x);
    return x;
  }

  set(name: string, value: any) {
    this.cache.delete(name);
    this.object[name] = this.unwrap(value);
  }

  wrap(a: any): ObjectFFI | MethodFFI | any {
    if (Array.isArray(a)) {
      return new LangList(a);
    } else if (typeof a === "function") {
      return new MethodFFI(a, this.object);
    } else if (typeof a === "object") {
      return new ObjectFFI(a);
    }
    return a;
  }

  unwrap(a: any): any {
    if (isMontyCallable(a)) {
      return (...args: any[]) => {
        a.call(args.map(this.wrap.bind(this)));
      };
    } else if (a instanceof ObjectFFI) {
      return a.object;
    }
    return a;
  }
}

export class MethodFFI extends ObjectFFI implements MontyCallable {
  isMontyCallable: true = true;
  parent: any;

  constructor(object: any, parent: any) {
    super(object);
    this.parent = parent;
  }

  async call(arguments_: any[]): Promise<any> {
    const args = arguments_.map(this.unwrap.bind(this));
    const value = await this.object.call(this.parent, ...args);
    return this.wrap(value);
  }

  arity(): number | "variadic" {
    if (this.object.length === 0) {
      return "variadic";
    }
    return this.object.length;
  }
}

export class LangList extends ObjectFFI implements Indexable {
  isIndexable: true = true;
  object: any[];

  constructor(list: any[]) {
    super(list);
    this.object = list;
  }

  get(name: Token) {
    if (name.lexeme === "append") {
      return new Append(this.object);
    } else if (name.lexeme === "pop") {
      return new Pop(this.object);
    }
    return super.get(name);
  }

  indexGet(bracket: Token, key: any): any {
    key = this.processKey(bracket, key);
    return this.object[key];
  }

  indexSet(bracket: Token, key: any, value: any) {
    key = this.processKey(bracket, key);
    // value = this.unwrap(value);
    this.object[key] = value;
  }

  private processKey(bracket: Token, key: any): number {
    if (typeof key !== "number") {
      throw new MontyTypeError(bracket, "Expect number for list index.");
    }
    if (key >= this.object.length || -key > this.object.length) {
      throw new MontyTypeError(bracket, "Index out of bounds.");
    }
    if (key < 0) return this.object.length + key;
    return key;
  }

  indexLength(): number {
    return this.object.length;
  }
}

class Append implements MontyCallable {
  isMontyCallable: true = true;
  list: any[];

  constructor(list: any[]) {
    this.list = list;
  }

  call(arguments_: any[]) {
    this.list.push(arguments_[0]);
  }

  arity(): number | "variadic" {
    return 1;
  }
}

class Pop implements MontyCallable {
  isMontyCallable: true = true;
  list: any[];

  constructor(list: any[]) {
    this.list = list;
  }

  call(_arguments_: any[]) {
    return this.list.pop();
  }

  arity(): number | "variadic" {
    return 0;
  }
}
