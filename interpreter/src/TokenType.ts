export enum TokenType {
  // Single-character tokens.
  LEFT_PAREN = "LEFT_PAREN",
  RIGHT_PAREN = "RIGHT_PAREN",
  LEFT_BRACKET = "LEFT_BRACKET",
  RIGHT_BRACKET = "RIGHT_BRACKET",
  LEFT_BRACE = "LEFT_BRACE",
  RIGHT_BRACE = "RIGHT_BRACE",
  COMMA = "COMMA",
  DOT = "DOT",
  MINUS = "MINUS",
  PLUS = "PLUS",
  SEMICOLON = "SEMICOLON",
  SLASH = "SLASH",
  STAR = "STAR",
  QUESTION = "QUESTION",
  COLON = "COLON",

  // One or two character tokens.
  BANG = "BANG",
  BANG_EQUAL = "BANG_EQUAL",
  EQUAL = "EQUAL",
  EQUAL_EQUAL = "EQUAL_EQUAL",
  GREATER = "GREATER",
  GREATER_EQUAL = "GREATER_EQUAL",
  LESS = "LESS",
  LESS_EQUAL = "LESS_EQUAL",

  // Literals.
  IDENTIFIER = "IDENTIFIER",
  STRING = "STRING",
  NUMBER = "NUMBER",

  // Keywords.
  AND = "AND",
  CLASS = "CLASS",
  ELSE = "ELSE",
  FALSE = "FALSE",
  DEF = "DEF",
  FOR = "FOR",
  IN = "IN",
  IF = "IF",
  ELIF = "ELIF",
  NONE = "NONE",
  OR = "OR",
  NOT = "NOT",
  RETURN = "RETURN",
  SUPER = "SUPER",
  TRUE = "TRUE",
  WHILE = "WHILE",
  ASYNC = "ASYNC",
  AWAIT = "AWAIT",

  // Whitespace
  INDENT = "INDENT",
  DEDENT = "DEDENT",
  NEWLINE = "NEWLINE",

  EOF = "EOF",
}
