import {
  Assign,
  Await,
  Binary,
  Call,
  Dict,
  Expr,
  ExprVisitor,
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
import { Interpreter } from "./Interpreter";
import { Monty } from "./Monty";
import {
  BlockStmt,
  ClassStmt,
  ExpressionStmt,
  FunctionStmt,
  IfStmt,
  ReturnStmt,
  Stmt,
  StmtVisitor,
  WhileStmt,
} from "./Stmt";
import { Token } from "./Token";

export class Resolver implements ExprVisitor<void>, StmtVisitor<void> {
  private readonly runtime: Monty;
  private readonly interpreter: Interpreter;
  private readonly scopes: Array<Map<string, boolean>> = [];
  private currentFunction: FunctionType = FunctionType.NONE;
  private currentClass: ClassType = ClassType.NONE;

  constructor(runtime: Monty, interpreter: Interpreter) {
    this.runtime = runtime;
    this.interpreter = interpreter;
  }

  resolve(x: Expr | Stmt | Stmt[]): void {
    if (x instanceof Expr) {
      x.accept(this);
    } else if (x instanceof Stmt) {
      x.accept(this);
    } else if (Array.isArray(x) && (x.length == 0 || x[0] instanceof Stmt)) {
      x.map((stmt) => this.resolve(stmt));
    }
  }

  resolveFunction(func: FunctionStmt, type: FunctionType) {
    const enclosingFunction = this.currentFunction;
    this.currentFunction = type;

    this.beginScope();
    for (const param of func.params) {
      this.define(param);
    }
    this.resolve(func.body);
    this.endScope();
    this.currentFunction = enclosingFunction;
  }

  // todo begin/endScope wrap?
  visitBlockStmt(stmt: BlockStmt): void {
    this.resolve(stmt.statements);
  }

  visitClassStmt(stmt: ClassStmt): void {
    const enclosingClass = this.currentClass;
    this.currentClass = ClassType.CLASS;

    this.define(stmt.name);

    if (
      stmt.superclass !== undefined &&
      stmt.name.lexeme === stmt.superclass.name.lexeme
    ) {
      this.runtime.error(stmt.name, "A class can't inherit from itself.");
    }

    if (stmt.superclass !== undefined) {
      this.currentClass = ClassType.SUBCLASS;
      this.resolve(stmt.superclass);
      this.beginScope();
      this.scopes[this.scopes.length - 1].set("super", true);
    }

    this.beginScope();
    this.scopes[this.scopes.length - 1].set("self", true);

    for (const method of stmt.methods) {
      let declaration = FunctionType.METHOD;
      if (method.name.lexeme === "__init__") {
        declaration = FunctionType.INITIALIZER;
      }
      this.resolveFunction(method, declaration);
    }

    this.endScope();

    if (stmt.superclass !== undefined) this.endScope();

    this.currentClass = enclosingClass;
  }

  visitGet(expr: Get): void {
    this.resolve(expr.object);
  }

  visitExpressionStmt(stmt: ExpressionStmt) {
    this.resolve(stmt.expression);
  }

  visitFunctionStmt(stmt: FunctionStmt): void {
    this.define(stmt.name);
    this.resolveFunction(stmt, FunctionType.FUNCTION);
  }

  visitIfStmt(stmt: IfStmt): void {
    for (const [condition, body] of stmt.branches) {
      this.resolve(condition);
      this.resolve(body);
    }
    if (stmt.elseBranch) this.resolve(stmt.elseBranch);
  }

  visitReturnStmt(stmt: ReturnStmt): void {
    if (this.currentFunction === FunctionType.NONE) {
      this.runtime.error(stmt.keyword, "Can't return from top-level code.");
    }

    if (stmt.value !== undefined) {
      if (this.currentFunction === FunctionType.INITIALIZER)
        this.runtime.error(
          stmt.keyword,
          "Can't return a value from an initializer."
        );
      this.resolve(stmt.value);
    }
  }

  visitWhileStmt(stmt: WhileStmt): void {
    this.resolve(stmt.condition);
    this.resolve(stmt.body);
  }

  visitAssign(expr: Assign): void {
    this.define(expr.name);
    this.resolve(expr.value);
    this.resolveLocal(expr, expr.name);
  }

  visitAwait(expr: Await): void {
    this.resolve(expr.value);
  }

  visitBinary(expr: Binary): void {
    this.resolve(expr.left);
    this.resolve(expr.right);
  }

  visitTernary(expr: Ternary): void {
    this.resolve(expr.left);
    this.resolve(expr.middle);
    this.resolve(expr.right);
  }

  visitIndex(expr: Index): void {
    this.resolve(expr.indexible);
    this.resolve(expr.index);
    if (expr.isAssign && expr.value) {
      this.resolve(expr.value);
    }
  }

  visitCall(expr: Call): void {
    this.resolve(expr.callee);
    expr.arguments_.map((argument) => this.resolve(argument));
  }

  visitGrouping(expr: Grouping): void {
    this.resolve(expr.expression);
  }

  visitDict(expr: Dict): void {
    expr.entries.forEach((entry) => {
      this.resolve(entry[0]);
      this.resolve(entry[1]);
    });
  }

  visitList(expr: List): void {
    expr.elements.forEach(this.resolve.bind(this));
  }

  visitLiteral(expr: Literal): void {}

  visitLogical(expr: Logical): void {
    this.resolve(expr.left);
    this.resolve(expr.right);
  }

  visitSetExpr(expr: SetExpr): void {
    this.resolve(expr.value);
    this.resolve(expr.object);
  }

  visitSuper(expr: Super): void {
    if (this.currentClass === ClassType.NONE) {
      this.runtime.error(
        expr.keyword,
        "Can't user 'super' outside of a class."
      );
    } else if (this.currentClass !== ClassType.SUBCLASS) {
      this.runtime.error(
        expr.keyword,
        "Can't use 'super' in a class with no superclass."
      );
    }

    this.resolveLocal(expr, expr.keyword);
  }

  visitUnary(expr: Unary): void {
    this.resolve(expr.right);
  }

  visitVariable(expr: Variable): void {
    if (
      this.scopes.length > 0 &&
      this.scopes[this.scopes.length - 1].get(expr.name.lexeme) === false
    ) {
      this.runtime.error(
        expr.name,
        "Can't read local variable in its own initializer."
      );
    }

    this.resolveLocal(expr, expr.name);
  }

  private beginScope(): void {
    this.scopes.push(new Map());
  }

  private endScope(): void {
    this.scopes.pop();
  }

  private define(name: Token) {
    if (this.scopes.length === 0) return;
    this.scopes[this.scopes.length - 1].set(name.lexeme, true);
  }

  private resolveLocal(expr: Expr, name: Token): void {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name.lexeme)) {
        this.interpreter.resolve(expr, this.scopes.length - 1 - i);
        return;
      }
    }
  }
}

enum FunctionType {
  NONE,
  FUNCTION,
  INITIALIZER,
  METHOD,
}

enum ClassType {
  NONE,
  CLASS,
  SUBCLASS,
}
