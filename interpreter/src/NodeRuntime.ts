import * as fs from "fs/promises";
import * as readline from "readline";
import { ObjectFFI } from "./ffi";
import { Monty } from "./Monty";
import { MontyCallable } from "./MontyCallable";
import { MontyError } from "./MontyError";
import { TokenType } from "./TokenType";

export class NodeRuntime extends Monty {
  constructor() {
    super();
    this.interpreter.ffi("console", new ObjectFFI(console));

    this.ffi(
      "print",
      new (class implements MontyCallable {
        isMontyCallable: true = true;
        arity(): number {
          return 1;
        }

        call(arguments_: any[]) {
          console.log(arguments_[0]);
        }
      })()
    );

    this.ffi(
      "clock",
      new (class implements MontyCallable {
        isMontyCallable: true = true;

        arity(): number {
          return 0;
        }

        call(_arguments_: any[]) {
          return Math.floor(Date.now() / 1000);
        }
      })()
    );
  }

  onError(error: MontyError): void {
    const token = error.token;
    if (typeof token === "number") {
      this.report(token, "", error.message);
    } else {
      if (token.type === TokenType.EOF) {
        this.report(token.line, " at end", error.message);
      } else {
        this.report(token.line, ` at "${token.lexeme}"`, error.message);
      }
    }
  }

  private report(line: number, where: string, message: string) {
    console.log(`[line ${line}] Error${where}: ${message}`);
  }

  async main(args: string[]) {
    if (args.length > 1) {
      console.log("Usage: lang [script]");
    } else if (args.length === 1) {
      this.runFile(args[0]);
    } else {
      await this.runPrompt();
    }
  }

  private async runFile(path: string) {
    const contents = await fs.readFile(path, { encoding: "utf-8" });
    this.run(contents);
    if (this.hadError) process.exit(65);
    if (this.hadRuntimeError) process.exit(70);
  }

  private async runPrompt(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    process.stdout.write("> ");
    rl.on("line", (line) => {
      this.run(line);
      if (this.hadError) {
        this.hadError = false;
      }
      process.stdout.write("> ");
    });
    return new Promise<void>((r) => {
      rl.on("close", () => {
        r();
      });
    });
  }
}

if (require.main === module) {
  const runtime = new NodeRuntime();
  runtime.main(process.argv.slice(2));
}
