import { Monty } from "./Monty";
import { Token } from "./Token";
import { TokenType } from "./TokenType";

export class Scanner {
  private readonly runtime: Monty;
  private readonly source: string;
  private readonly tokens: Array<Token> = [];
  private start = 0; // of lexeme
  private current = 0;
  private line = 1; // so we can produce tokens that know their location
  private indentLevel = 0;

  private readonly keywords: Map<string, TokenType> = new Map(
    Object.entries({
      and: TokenType.AND,
      class: TokenType.CLASS,
      else: TokenType.ELSE,
      False: TokenType.FALSE,
      for: TokenType.FOR,
      in: TokenType.IN,
      def: TokenType.DEF,
      if: TokenType.IF,
      elif: TokenType.ELIF,
      None: TokenType.NONE,
      or: TokenType.OR,
      not: TokenType.NOT,
      return: TokenType.RETURN,
      super: TokenType.SUPER,
      True: TokenType.TRUE,
      while: TokenType.WHILE,
      async: TokenType.ASYNC,
      await: TokenType.AWAIT,
    })
  );

  constructor(runtime: Monty, source: string) {
    this.runtime = runtime;
    this.source = source;
  }

  scanTokens(): Array<Token> {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.scanToken();
    }

    this.tokens.push(new Token(TokenType.NEWLINE, "\n", undefined, this.line));
    this.tokens.push(new Token(TokenType.EOF, "", undefined, this.line + 1));
    return this.tokens;
  }

  private scanToken() {
    const c = this.advance();
    switch (c) {
      case "(":
        this.addToken(TokenType.LEFT_PAREN);
        break;
      case ")":
        this.addToken(TokenType.RIGHT_PAREN);
        break;
      case "[":
        this.addToken(TokenType.LEFT_BRACKET);
        break;
      case "]":
        this.addToken(TokenType.RIGHT_BRACKET);
        break;
      case "{":
        this.addToken(TokenType.LEFT_BRACE);
        break;
      case "}":
        this.addToken(TokenType.RIGHT_BRACE);
        break;
      case ",":
        this.addToken(TokenType.COMMA);
        break;
      case ".":
        this.addToken(TokenType.DOT);
        break;
      case "-":
        this.addToken(TokenType.MINUS);
        break;
      case "+":
        this.addToken(TokenType.PLUS);
        break;
      case ";":
        this.addToken(TokenType.SEMICOLON);
        break;
      case "/":
        this.addToken(TokenType.SLASH);
        break;
      case "*":
        this.addToken(TokenType.STAR);
        break;
      case "?":
        this.addToken(TokenType.QUESTION);
        break;
      case ":":
        this.addToken(TokenType.COLON);
        break;
      case "!":
        this.addToken(this.match("=") ? TokenType.BANG_EQUAL : TokenType.BANG);
        break;
      case "=":
        this.addToken(
          this.match("=") ? TokenType.EQUAL_EQUAL : TokenType.EQUAL
        );
        break;
      case "<":
        this.addToken(this.match("=") ? TokenType.LESS_EQUAL : TokenType.LESS);
        break;
      case ">":
        this.addToken(
          this.match("=") ? TokenType.GREATER_EQUAL : TokenType.GREATER
        );
        break;

      case "#":
        // "#" comments
        while (this.peek() != "\n" && !this.isAtEnd()) this.advance();
        break;

      // whitespace
      case " ":
      case "\r":
      case "\t":
        break;
      case "\n":
        this.line++;
        this.newline();
        break;

      case '"':
        this.string('"');
        break;
      case "'":
        this.string("'");
        break;

      default:
        if (this.isDigit(c)) {
          this.number();
        } else if (this.isAlpha(c)) {
          this.identifier();
        } else {
          this.runtime.error(this.line, "Unexpected character.");
        }
        break;
    }
  }

  private newline() {
    // python NEWLINE vs NL https://stackoverflow.com/a/27382560
    let indents = 0;
    let spaces = 0;
    while (true) {
      if (this.match(" ")) spaces += 1;
      else if (this.match("\t")) indents += 1;
      else if (this.match("\r")) continue;
      else if (this.match("#")) {
        while (this.peek() != "\n" && !this.isAtEnd()) this.advance();
      } else if (this.match("\n")) {
        this.line++;
        indents = 0;
        spaces = 0;
      } else break;
    }
    indents += Math.floor(spaces / 4);
    if (this.indentLevel < indents) {
      for (; this.indentLevel < indents; this.indentLevel++) {
        this.addToken(TokenType.INDENT);
      }
    } else if (this.indentLevel > indents) {
      for (; this.indentLevel > indents; this.indentLevel--) {
        this.addToken(TokenType.DEDENT);
      }
    } else this.addToken(TokenType.NEWLINE);
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private advance(): string {
    return this.source[this.current++];
  }

  // this is called lookahead
  private peek() {
    if (this.isAtEnd()) return "\0";
    return this.source[this.current];
  }

  private peekNext() {
    if (this.current + 1 >= this.source.length) return "\0";
    return this.source[this.current + 1];
  }

  // combines advance and peek
  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source[this.current] != expected) return false;

    this.current++;
    return true;
  }

  private addToken(type: TokenType, literal?: any) {
    const text = this.source.slice(this.start, this.current);
    this.tokens.push(new Token(type, text, literal, this.line));
  }

  private string(delimiter: '"' | "'") {
    while (this.peek() !== delimiter && !this.isAtEnd()) {
      if (this.peek() === "\n") this.line++;
      this.advance();
    }

    if (this.isAtEnd()) {
      this.runtime.error(this.line, "Unterminated string.");
    }

    // closing "
    this.advance();

    // trim surrounding "
    const value = this.source.slice(this.start + 1, this.current - 1);
    this.addToken(TokenType.STRING, value);
  }

  private number() {
    while (this.isDigit(this.peek())) this.advance();
    if (this.peek() === "." && this.isDigit(this.peekNext())) {
      this.advance();
      while (this.isDigit(this.peek())) this.advance();
    }

    this.addToken(
      TokenType.NUMBER,
      parseFloat(this.source.slice(this.start, this.current))
    );
  }

  private identifier() {
    while (this.isAlphaNumeric(this.peek())) this.advance();

    const text = this.source.slice(this.start, this.current);
    this.addToken(this.keywords.get(text) || TokenType.IDENTIFIER);
  }

  private isAlpha(c: string) {
    return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
  }

  private isDigit(c: string): boolean {
    return "0" <= c && c <= "9";
  }

  private isAlphaNumeric(c: string) {
    return this.isAlpha(c) || this.isDigit(c);
  }
}
