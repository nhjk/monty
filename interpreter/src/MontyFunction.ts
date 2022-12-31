import { Environment } from "./Environment";
import { Interpreter } from "./Interpreter";
import { MontyCallable } from "./MontyCallable";
import { MontyRuntimeError } from "./MontyError";
import { MontyInstance } from "./MontyInstance";
import { MontyPromise } from "./MontyPromise";
import { Return } from "./Return";
import { FunctionStmt } from "./Stmt";

export class MontyFunction implements MontyCallable {
  isMontyCallable: true = true;
  private readonly interpreter: Interpreter;
  private readonly declaration: FunctionStmt;
  private readonly closure: Environment;

  private readonly isInitializer: boolean;
  private readonly isMethod: boolean;
  private readonly isAsync: boolean;

  constructor(
    interpreter: Interpreter,
    declaration: FunctionStmt,
    closure: Environment,
    isInitializer: boolean,
    isMethod: boolean,
    isAsync: boolean
  ) {
    this.interpreter = interpreter;
    this.declaration = declaration;
    this.closure = closure;
    this.isInitializer = isInitializer;
    this.isMethod = isMethod;
    this.isAsync = isAsync;
  }

  langBind(instance: MontyInstance): MontyFunction {
    const environment = new Environment(this.closure);
    environment.define("self", instance);
    return new MontyFunction(
      this.interpreter,
      this.declaration,
      environment,
      this.isInitializer,
      this.isMethod,
      this.isAsync
    );
  }

  async call(arguments_: any[]): Promise<any> {
    const environment = new Environment(this.closure);

    let params = this.declaration.params;
    if (this.isMethod) {
      if (params.length > 0 && params[0].lexeme === "self") {
        environment.define("self", this.closure.getAt(0, "self"));
        params = params.slice(1);
      } else {
        throw new MontyRuntimeError(
          this.declaration.name,
          "Missing required first argument self."
        );
      }
    }

    for (let i = 0; i < params.length; i++) {
      environment.define(params[i].lexeme, arguments_[i]);
    }

    if (this.isAsync) {
      return new MontyPromise(this.execute(this.interpreter, environment));
    }
    const value = await this.execute(this.interpreter, environment);
    if (this.isInitializer) return this.closure.getAt(0, "self");
    return value;
  }

  private async execute(interpreter: Interpreter, environment: Environment) {
    try {
      await interpreter.executeBlock(this.declaration.body, environment);
    } catch (returnValue) {
      if (returnValue instanceof Return) {
        if (this.isInitializer) return this.closure.getAt(0, "self");

        return returnValue.value;
      }
      throw returnValue;
    }
  }

  arity(): number {
    if (this.isMethod) return this.declaration.params.length - 1;
    return this.declaration.params.length;
  }

  toString(): string {
    return `<fn ${this.declaration.name.lexeme}>`;
  }
}
