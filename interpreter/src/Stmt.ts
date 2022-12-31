// generated by src/tool/GenerateAst.ts

import { Token } from "./Token";

import { Expr, Variable } from "./Expr";

export abstract class Stmt {
  abstract accept<R>(visitor: StmtVisitor<R>): Promise<R>;
}

export interface StmtVisitor<R> {
  visitBlockStmt: (stmt: BlockStmt) => R;
  visitClassStmt: (stmt: ClassStmt) => R;
  visitExpressionStmt: (stmt: ExpressionStmt) => R;
  visitFunctionStmt: (stmt: FunctionStmt) => R;
  visitIfStmt: (stmt: IfStmt) => R;
  visitReturnStmt: (stmt: ReturnStmt) => R;
  visitWhileStmt: (stmt: WhileStmt) => R;
}

export class BlockStmt extends Stmt {
  constructor(
    readonly statements: Stmt[],
  ) {
    super();
  }

  async accept<R>(visitor: StmtVisitor<R>): Promise<R> {
    return visitor.visitBlockStmt(this);
  }
}

export class ClassStmt extends Stmt {
  constructor(
    readonly name: Token,
    readonly methods: FunctionStmt[],
    readonly superclass?: Variable,
  ) {
    super();
  }

  async accept<R>(visitor: StmtVisitor<R>): Promise<R> {
    return visitor.visitClassStmt(this);
  }
}

export class ExpressionStmt extends Stmt {
  constructor(
    readonly expression: Expr,
  ) {
    super();
  }

  async accept<R>(visitor: StmtVisitor<R>): Promise<R> {
    return visitor.visitExpressionStmt(this);
  }
}

export class FunctionStmt extends Stmt {
  constructor(
    readonly name: Token,
    readonly params: Token[],
    readonly body: Stmt[],
    readonly async_: boolean,
  ) {
    super();
  }

  async accept<R>(visitor: StmtVisitor<R>): Promise<R> {
    return visitor.visitFunctionStmt(this);
  }
}

export class IfStmt extends Stmt {
  constructor(
    readonly branches: [Expr,Stmt][],
    readonly elseBranch?: Stmt,
  ) {
    super();
  }

  async accept<R>(visitor: StmtVisitor<R>): Promise<R> {
    return visitor.visitIfStmt(this);
  }
}

export class ReturnStmt extends Stmt {
  constructor(
    readonly keyword: Token,
    readonly value?: Expr,
  ) {
    super();
  }

  async accept<R>(visitor: StmtVisitor<R>): Promise<R> {
    return visitor.visitReturnStmt(this);
  }
}

export class WhileStmt extends Stmt {
  constructor(
    readonly condition: Expr,
    readonly body: Stmt,
  ) {
    super();
  }

  async accept<R>(visitor: StmtVisitor<R>): Promise<R> {
    return visitor.visitWhileStmt(this);
  }
}

