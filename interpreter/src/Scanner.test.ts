import { Monty } from "./Monty";
import { Scanner } from "./Scanner";
import { TokenType } from "./TokenType";

test("indents", () => {
  const source = `def a():
    return 0
`;
  const scanner = new Scanner(new Monty(), source);
  const tokens = scanner.scanTokens();
  const actual = tokens.map((t) => t.type);
  const expected = [
    TokenType.DEF,
    TokenType.IDENTIFIER,
    TokenType.LEFT_PAREN,
    TokenType.RIGHT_PAREN,
    TokenType.COLON,
    TokenType.INDENT,
    TokenType.RETURN,
    TokenType.NUMBER,
    TokenType.DEDENT,
    TokenType.NEWLINE,
    TokenType.EOF,
  ];
  expect(actual).toEqual(expected);
});

test("indents 2", () => {
  const source = `i = 0
while True:
    i = i + 1
`;
  const scanner = new Scanner(new Monty(), source);
  const tokens = scanner.scanTokens();
  const actual = tokens.map((t) => t.type);
  const expected = [
    TokenType.IDENTIFIER,
    TokenType.EQUAL,
    TokenType.NUMBER,
    TokenType.NEWLINE,
    TokenType.WHILE,
    TokenType.TRUE,
    TokenType.COLON,
    TokenType.INDENT,
    TokenType.IDENTIFIER,
    TokenType.EQUAL,
    TokenType.IDENTIFIER,
    TokenType.PLUS,
    TokenType.NUMBER,
    TokenType.DEDENT,
    TokenType.NEWLINE,
    TokenType.EOF,
  ];
  expect(actual).toEqual(expected);
});
