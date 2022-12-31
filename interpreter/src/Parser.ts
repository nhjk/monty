import {
  Assign,
  Await,
  Binary,
  Call,
  Dict,
  Expr,
  Get,
  Grouping,
  Index,
  List,
  Literal,
  Logical,
  SetExpr,
  Super,
  Ternary,
  Unary,
  Variable,
} from "./Expr";
import { Monty } from "./Monty";
import {
  BlockStmt,
  ClassStmt,
  ExpressionStmt,
  FunctionStmt,
  IfStmt,
  ReturnStmt,
  Stmt,
  WhileStmt,
} from "./Stmt";
import { Token } from "./Token";
import { TokenType } from "./TokenType";

/*
Grammar

program        → (declaration | NEWLINE)* EOF ;

declaration    → classDecl
               | functionDecl
               | asyncFunDecl
               | statement ;

classDecl      → "class" IDENTIFIER ("(" IDENTIFIER ")")? ":" block ;

functionDecl   → "def" IDENTIFIER "(" parameters? ")" ":" block ;
parameters     → IDENTIFIER ( "," IDENTIFIER )* ;

asyncFunDecl   → "async" functionDecl

statement      → exprStmt
               | ifStmt
               | printStmt
               | returnStmt
               | whileStmt
               | forStmt
               | block ;

block          → INDENT declaration* DEDENT ;

returnStmt     → "return" expression? newline ;
exprStmt       → expression newline ;

newline        → NEWLINE | !INDENT | !DEDENT ;

expression     → assignment ;
assignment     → ( index "." )? IDENTIFIER "=" assignment
               | await ;
await          → "await" ternary ;
ternary        → ( equality "?" equality ":" )* logic_or ;
logic_or       → logic_and ( "or" logic_and )* ;
logic_and      → equality ( "and" equality )* ;
equality       → comparison ( ( "!=" | "==" ) comparison )* ;
comparison     → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;
term           → factor ( ( "-" | "+" ) factor )* ;
factor         → unary ( ( "/" | "*" ) unary )* ;
unary          → ( "not" | "-" ) unary | index ;
index          → call ( "[" expression "]" | "." IDENTIFIER )* ;
call           → primary ( "(" arguments? ")" | "." IDENTIFIER )* ;
primary        → "true" | "false" | "nil"
               | NUMBER | STRING | IDENTIFIER
               | "(" expression ")"
               | "[" arguments? "]"
               | "{" ( expression ":" expression ( "," NEWLINE* expression ":" expression )* )? "}"
               | "super" "." IDENTIFIER ;

arguments      → expression ( "," NEWLINE* expression )* ;

ifStmt         → "if" expression ":" block
               ( "elif" expression ":" block )*
               ( "else" ":" block ) ;

whileStmt      → "while" expression ":" block ;

forStmt        → "for" IDENTIFIER
                 "in" expression ":"
                 block
*/

export class Parser {
  private runtime: Monty;
  private readonly tokens: Token[];
  private tokenIndex = 0;
  private dummyVariableCount = 0; // for creating dummy variables (while -> for)

  constructor(runtime: Monty, tokens: Token[]) {
    this.runtime = runtime;
    this.tokens = tokens;
  }

  parse(): (Stmt | undefined)[] {
    const statements = [];
    while (!this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) continue;
      statements.push(this.declaration());
    }
    return statements;
  }

  private declaration(): Stmt | undefined {
    try {
      if (this.match(TokenType.CLASS)) return this.classDeclaration();
      if (this.match(TokenType.DEF)) return this.function(false);
      if (this.match(TokenType.ASYNC) && this.match(TokenType.DEF))
        return this.function(true);

      return this.statement();
    } catch (error) {
      if (error instanceof ParseError) {
        this.synchronize();
        return undefined;
      }
      throw error;
    }
  }

  private classDeclaration(): Stmt {
    const name = this.consume(TokenType.IDENTIFIER, `Expect class name.`);

    let superclass = undefined;
    if (this.match(TokenType.LEFT_PAREN)) {
      this.consume(TokenType.IDENTIFIER, "Expect superclass name.");
      superclass = new Variable(this.previous());
      this.consume(
        TokenType.RIGHT_PAREN,
        "Expect right parethesis after superclass."
      );
      this.consume(TokenType.COLON, "Expect colon after superclass name.");
    } else {
      this.consume(TokenType.COLON, "Expect colon after class name.");
    }

    const body = this.block();
    const methods = body.filter(
      (declaration) => declaration instanceof FunctionStmt
    ) as FunctionStmt[];

    return new ClassStmt(name, methods, superclass);
  }

  private function(isAsync: boolean): FunctionStmt {
    const name = this.consume(TokenType.IDENTIFIER, `Expect function name.`);
    this.consume(TokenType.LEFT_PAREN, "Expect '(' to follow fun.");
    const parameters = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      while (true) {
        if (parameters.length >= 255) {
          this.error(this.peek(), "Can't have more than 255 parameters.");
        }
        parameters.push(
          this.consume(TokenType.IDENTIFIER, "Expect parameter name.")
        );
        if (!this.match(TokenType.COMMA)) break;
      }
    }
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' to follow parameters.");
    this.consume(TokenType.COLON, "Expect ':' before function body.");

    const body = this.block();
    return new FunctionStmt(name, parameters, body, isAsync);
  }

  private statement(): Stmt {
    if (this.match(TokenType.IF)) return this.ifStatement();
    if (this.match(TokenType.WHILE)) return this.whileStatement();
    if (this.match(TokenType.FOR)) return this.forStatement();
    if (this.match(TokenType.RETURN)) return this.returnStatement();
    if (this.peek().type === TokenType.INDENT) {
      return new BlockStmt(this.block());
    }

    return this.expressionStatement();
  }

  forStatement(): Stmt {
    const item = this.consume(
      TokenType.IDENTIFIER,
      `Expect identifier after for.`
    );
    this.consume(TokenType.IN, "Expect 'in'.");
    const iterable = this.expression();
    const line = this.consume(
      TokenType.COLON,
      "Expect ':' after iterable."
    ).line;

    const i = this.dummyVariable("i", line);
    const length = this.dummyVariable("length", line);
    const condition = new Binary(
      new Variable(i),
      new Token(TokenType.LESS, "<", undefined, line),
      new Variable(length)
    );

    return new BlockStmt([
      new ExpressionStmt(
        new Assign(
          length,
          new Call(
            new Variable(
              new Token(TokenType.IDENTIFIER, "len", undefined, line)
            ),
            new Token(TokenType.RIGHT_PAREN, ")", undefined, line),
            [iterable]
          )
        )
      ),
      new ExpressionStmt(new Assign(i, new Literal(0))),
      new WhileStmt(
        condition,
        new BlockStmt([
          new ExpressionStmt(
            new Assign(
              item,
              new Index(
                iterable,
                new Token(TokenType.RIGHT_BRACKET, "]", undefined, line),
                new Variable(i),
                false
              )
            )
          ),
          ...this.block(),
          new ExpressionStmt(
            new Assign(
              i,
              new Binary(
                new Variable(i),
                new Token(TokenType.PLUS, "+", undefined, line),
                new Literal(1)
              )
            )
          ),
        ])
      ),
    ]);
  }

  private ifStatement(): Stmt {
    const branches: [Expr, Stmt][] = [];
    while (true) {
      const condition = this.expression();
      this.consume(TokenType.COLON, 'Expect ":" after condition.');
      const body = new BlockStmt(this.block());
      branches.push([condition, body]);
      if (!this.match(TokenType.ELIF)) break;
    }

    let elseBranch = undefined;
    if (this.match(TokenType.ELSE)) {
      this.consume(TokenType.COLON, 'Expect ":" after condition.');
      elseBranch = new BlockStmt(this.block());
    }

    return new IfStmt(branches, elseBranch);
  }

  private whileStatement(): Stmt {
    const condition = this.expression();
    this.consume(TokenType.COLON, "Expect ':' after while condition.");
    const body = new BlockStmt(this.block());

    return new WhileStmt(condition, body);
  }

  private returnStatement(): ReturnStmt {
    const keyword = this.previous();
    let value = undefined;
    if (!this.checkSPACE()) {
      value = this.expression();
    }

    this.newline();
    return new ReturnStmt(keyword, value);
  }

  private block(): Stmt[] {
    this.consume(TokenType.INDENT, "Missing indent at block start.");

    const stmts: Stmt[] = [];
    while (!this.check(TokenType.DEDENT) && !this.isAtEnd()) {
      const declaration = this.declaration();
      if (declaration) stmts.push(declaration);
    }

    this.consume(TokenType.DEDENT, "Expect unindent after block.");
    return stmts;
  }

  private newline(): void {
    if (this.match(TokenType.NEWLINE)) return;
    if (this.check(TokenType.INDENT) || this.check(TokenType.DEDENT)) return;
    this.runtime.error(this.peek(), "Expect newline.");
  }

  private expressionStatement(): ExpressionStmt {
    const expr = this.expression();
    this.newline();
    return new ExpressionStmt(expr);
  }

  private expression(): Expr {
    return this.assignment();
  }

  private assignment(): Expr {
    const expr = this.await_();

    if (this.match(TokenType.EQUAL)) {
      const equals = this.previous();
      const value = this.assignment();

      if (expr instanceof Variable) {
        return new Assign(expr.name, value);
      } else if (expr instanceof Get) {
        return new SetExpr(expr.object, expr.name, value);
      } else if (expr instanceof Index) {
        return new Index(expr.indexible, expr.bracket, expr.index, true, value);
      }

      this.error(equals, "Invalid assignment target.");
    }

    return expr;
  }

  private await_(): Expr {
    if (!this.match(TokenType.AWAIT)) return this.ternary();
    return new Await(this.ternary());
  }

  private ternary(): Expr {
    let expr = this.or();

    while (this.match(TokenType.QUESTION)) {
      const question = this.previous();
      const middle = this.or();
      const colon = this.consume(TokenType.COLON, 'expected ":" in ternary');
      const right = this.or();
      expr = new Ternary(expr, question, middle, colon, right);
    }

    return expr;
  }

  private or(): Expr {
    let expr = this.and();

    while (this.match(TokenType.OR)) {
      const operator = this.previous();
      const right = this.and();
      expr = new Logical(expr, operator, right);
    }

    return expr;
  }

  private and(): Expr {
    let expr = this.equality();

    while (this.match(TokenType.AND)) {
      const operator = this.previous();
      const right = this.equality();
      expr = new Logical(expr, operator, right);
    }

    return expr;
  }

  private equality(): Expr {
    let expr = this.comparison();

    while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
      const operator = this.previous();
      const right = this.comparison();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  private comparison(): Expr {
    let expr = this.term();

    while (
      this.match(
        TokenType.GREATER,
        TokenType.GREATER_EQUAL,
        TokenType.LESS,
        TokenType.LESS_EQUAL
      )
    ) {
      const operator = this.previous();
      const right = this.term();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  private term(): Expr {
    let expr = this.factor();

    while (this.match(TokenType.MINUS, TokenType.PLUS)) {
      const operator = this.previous();
      const right = this.factor();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  private factor(): Expr {
    let expr = this.unary();

    while (this.match(TokenType.SLASH, TokenType.STAR)) {
      const operator = this.previous();
      const right = this.unary();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  private unary(): Expr {
    if (this.match(TokenType.NOT, TokenType.MINUS)) {
      return new Unary(this.previous(), this.unary());
    }
    return this.index();
  }

  private index(): Expr {
    let expr = this.call();

    while (true) {
      if (this.match(TokenType.LEFT_BRACKET)) {
        const index = this.expression();
        const bracket = this.consume(
          TokenType.RIGHT_BRACKET,
          "Expect closing ']' after index."
        );
        expr = new Index(expr, bracket, index, false);
      } else if (this.match(TokenType.DOT)) {
        const name = this.consume(
          TokenType.IDENTIFIER,
          "Expect property name after '.'."
        );
        expr = new Get(expr, name);
      } else {
        break;
      }
    }

    return expr;
  }

  private call(): Expr {
    let expr = this.primary();

    while (true) {
      if (this.match(TokenType.LEFT_PAREN)) {
        const [args, paren] = this.arguments_(TokenType.RIGHT_PAREN);
        expr = new Call(expr, paren, args);
      } else if (this.match(TokenType.DOT)) {
        const name = this.consume(
          TokenType.IDENTIFIER,
          "Expect property name after '.'."
        );
        expr = new Get(expr, name);
      } else {
        break;
      }
    }

    return expr;
  }

  private arguments_(delimiter: TokenType): [Expr[], Token] {
    this.discardNewlines();
    const args = [];
    while (!this.check(delimiter)) {
      if (args.length >= 255) {
        this.error(this.peek(), "Can't have more than 255 arguments.");
      }
      args.push(this.expression());
      const isComma = this.match(TokenType.COMMA);
      this.discardNewlines();
      if (!isComma) break;
    }
    const token = this.consume(
      delimiter,
      `Expect ${delimiter} after arguments.`
    );
    return [args, token];
  }

  private primary(): Expr {
    if (this.match(TokenType.FALSE)) return new Literal(false);
    if (this.match(TokenType.TRUE)) return new Literal(true);
    if (this.match(TokenType.NONE)) return new Literal(undefined);

    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      return new Literal(this.previous().literal);
    }

    if (this.match(TokenType.SUPER)) {
      const keyword = this.previous();
      this.consume(TokenType.DOT, "Expect '.' after 'super'.");
      const method = this.consume(
        TokenType.IDENTIFIER,
        "Expect superclass method name."
      );
      return new Super(keyword, method);
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return new Variable(this.previous());
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, 'Expected ")" after expression');
      return new Grouping(expr);
    }

    if (this.match(TokenType.LEFT_BRACKET)) {
      const [elements, bracket] = this.arguments_(TokenType.RIGHT_BRACKET);
      return new List(elements, bracket);
    }

    if (this.match(TokenType.LEFT_BRACE)) {
      this.discardNewlines();
      const entries = [];
      while (!this.match(TokenType.RIGHT_BRACE)) {
        if (entries.length >= 255) {
          this.error(this.peek(), "Can't have more than 255 entries.");
        }
        const key = this.expression();
        this.consume(TokenType.COLON, "Expect ':' after key.");
        const value = this.expression();
        entries.push([key, value] as [Expr, Expr]);
        const isComma = this.match(TokenType.COMMA);
        this.discardNewlines();
        if (!isComma) {
          this.consume(TokenType.RIGHT_BRACE, "Expect closing '}'.");
          break;
        }
      }
      return new Dict(entries);
    }

    throw this.error(this.peek(), "Expect expression.");
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string) {
    if (this.check(type)) return this.advance();
    throw this.error(this.peek(), message);
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private checkSPACE(): boolean {
    return (
      this.check(TokenType.NEWLINE) ||
      this.check(TokenType.INDENT) ||
      this.check(TokenType.DEDENT)
    );
  }

  private discardNewlines(): void {
    while (this.match(TokenType.NEWLINE, TokenType.INDENT, TokenType.DEDENT)) {
      continue;
    }
  }

  private isAtEnd() {
    return this.peek().type === TokenType.EOF;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.tokenIndex += 1;
    return this.previous();
  }

  private peek(): Token {
    return this.tokens[this.tokenIndex];
  }

  private previous(): Token {
    return this.tokens[this.tokenIndex - 1];
  }

  private error(token: Token, message: string): ParseError {
    this.runtime.error(token, message);
    return new ParseError(token, message);
  }

  private synchronize() {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.NEWLINE) return;

      switch (this.peek().type) {
        case TokenType.CLASS:
        case TokenType.DEF:
        case TokenType.FOR:
        case TokenType.IF:
        case TokenType.WHILE:
        case TokenType.RETURN:
          return;
      }

      this.advance();
    }
  }

  private dummyVariable(name: string, line: number): Token {
    this.dummyVariableCount += 1;
    return new Token(
      TokenType.IDENTIFIER,
      `${name}_${this.dummyVariableCount}`,
      undefined,
      line
    );
  }
}

class ParseError extends Error {
  readonly token: Token;

  constructor(token: Token, message: string) {
    super(message);
    this.token = token;
  }
}
