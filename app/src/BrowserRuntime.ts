import { Monty } from "./interpreter/Monty";
import { MontyError } from "./interpreter/MontyError";

export type onErrorType = (error: MontyError | undefined) => void;

export class BrowserRuntime extends Monty {
  onError: onErrorType;

  constructor(onError: onErrorType) {
    super();
    this.onError = onError;
  }
}
