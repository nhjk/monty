import { MontyRuntimeError } from "./MontyError";
import { Token } from "./Token";

export class Environment {
  readonly enclosing?: Environment;
  private readonly values = new Map<string, any>();

  constructor(enclosing?: Environment) {
    this.enclosing = enclosing;
  }

  get(name: Token): any {
    if (this.values.has(name.lexeme)) {
      return this.values.get(name.lexeme);
    }

    if (this.enclosing) return this.enclosing.get(name);

    throw new MontyRuntimeError(name, `Undefined variable "${name.lexeme}".`);
  }

  has(lexeme: string): boolean {
    return this.values.has(lexeme);
  }

  define(name: string, value: any): void {
    this.values.set(name, value);
  }

  getAt(distance: number, name: string): any {
    const ancestor = this.ancestor(distance);
    if (!ancestor.values.has(name))
      throw new Error(
        `InterpreterError expected ${name} at distance ${distance}.`
      );
    return this.ancestor(distance).values.get(name);
  }

  assignAt(distance: number, name: Token, value: any) {
    this.ancestor(distance).values.set(name.lexeme, value);
  }

  ancestor(distance: number): Environment {
    let environment = this as Environment | undefined;
    for (let i = 0; i < distance; i++) {
      if (!environment)
        throw TypeError(`Environment undefined at distance ${distance}.`);
      environment = environment.enclosing;
    }
    if (!environment)
      throw TypeError(`Environment undefined at distance ${distance}.`);
    return environment;
  }

  assign(name: Token, value: any): void {
    if (this.values.has(name.lexeme)) {
      this.values.set(name.lexeme, value);
      return;
    }

    if (this.enclosing) {
      this.enclosing.assign(name, value);
      return;
    }

    throw new MontyRuntimeError(name, `Undefined variable ${name.lexeme}.`);
  }
}
