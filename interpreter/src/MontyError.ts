import { Token } from "./Token";

export class MontyError extends Error {
  readonly token: Token | number;

  constructor(token: Token | number, message: string) {
    super(message);
    this.token = token;
  }
}

export class MontyRuntimeError extends MontyError {
  readonly token: Token;

  constructor(token: Token, message: string) {
    super(token, message);
    this.token = token;
  }
}

export class MontyTypeError extends MontyRuntimeError {}
