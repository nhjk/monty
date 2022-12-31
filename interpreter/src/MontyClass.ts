import { MontyCallable } from "./MontyCallable";
import { MontyFunction } from "./MontyFunction";
import { MontyInstance } from "./MontyInstance";

export class MontyClass implements MontyCallable {
  isMontyCallable: true = true;
  readonly name: string;
  readonly superclass?: MontyClass;
  readonly methods: Map<string, MontyFunction>;

  constructor(
    name: string,
    methods: Map<string, MontyFunction>,
    superclass: MontyClass | undefined
  ) {
    this.name = name;
    this.methods = methods;
    this.superclass = superclass;
  }

  findMethod(name: string): MontyFunction | undefined {
    if (this.methods.has(name)) {
      return this.methods.get(name);
    }

    if (this.superclass) {
      return this.superclass.findMethod(name);
    }
  }

  async call(arguments_: any[]) {
    const instance = new MontyInstance(this);
    const initializer = this.findMethod("__init__");
    if (initializer !== undefined) {
      await initializer.langBind(instance).call(arguments_);
    }

    return instance;
  }

  arity(): number {
    const initializer = this.findMethod("__init__");
    if (initializer === undefined) return 0;
    return initializer.arity();
  }

  toString(): string {
    return this.name;
  }
}
