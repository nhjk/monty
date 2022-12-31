import { MontyClass } from "./MontyClass";
import { MontyRuntimeError } from "./MontyError";
import { Token } from "./Token";

export class MontyInstance {
  private klass: MontyClass;
  private readonly fields: Map<string, any> = new Map();

  constructor(klass: MontyClass) {
    this.klass = klass;
  }

  get(name: Token): any {
    if (this.fields.has(name.lexeme)) {
      return this.fields.get(name.lexeme);
    }

    const method = this.klass.findMethod(name.lexeme);
    if (method !== undefined) return method.langBind(this);

    throw new MontyRuntimeError(name, `Undefined property '${name.lexeme}'.`);
  }

  set(name: string, value: any) {
    this.fields.set(name, value);
  }

  toString() {
    return `${this.klass.name} instance`;
  }
}
