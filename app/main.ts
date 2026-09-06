import fs from "fs";

interface Token {
  type: string;
  lexeme: string;
  literal: string | null;
  line: number;
}

function isDigit(char: string | undefined): boolean {
  return char !== undefined && char >= "0" && char <= "9";
}

function isAlpha(char: string | undefined): boolean {
  return (
    char !== undefined &&
    ((char >= "a" && char <= "z") || (char >= "A" && char <= "Z") || char === "_")
  );
}

function isAlphaNumeric(char: string | undefined): boolean {
  return isAlpha(char) || isDigit(char);
}

const keywords: Record<string, string> = {
  and: "AND",
  class: "CLASS",
  else: "ELSE",
  false: "FALSE",
  for: "FOR",
  fun: "FUN",
  if: "IF",
  nil: "NIL",
  or: "OR",
  print: "PRINT",
  return: "RETURN",
  super: "SUPER",
  this: "THIS",
  true: "TRUE",
  var: "VAR",
  while: "WHILE",
};

function scan(fileContent: string): { tokens: Token[]; hadError: boolean } {
  const tokens: Token[] = [];
  let hadError = false;
  let line = 1;
  let i = 0;

  while (i < fileContent.length) {
    const char = fileContent[i];
    switch (char) {
      case "(":
        tokens.push({ type: "LEFT_PAREN", lexeme: "(", literal: null, line });
        break;
      case ")":
        tokens.push({ type: "RIGHT_PAREN", lexeme: ")", literal: null, line });
        break;
      case "{":
        tokens.push({ type: "LEFT_BRACE", lexeme: "{", literal: null, line });
        break;
      case "}":
        tokens.push({ type: "RIGHT_BRACE", lexeme: "}", literal: null, line });
        break;
      case ",":
        tokens.push({ type: "COMMA", lexeme: ",", literal: null, line });
        break;
      case ".":
        tokens.push({ type: "DOT", lexeme: ".", literal: null, line });
        break;
      case "-":
        tokens.push({ type: "MINUS", lexeme: "-", literal: null, line });
        break;
      case "+":
        tokens.push({ type: "PLUS", lexeme: "+", literal: null, line });
        break;
      case ";":
        tokens.push({ type: "SEMICOLON", lexeme: ";", literal: null, line });
        break;
      case "*":
        tokens.push({ type: "STAR", lexeme: "*", literal: null, line });
        break;
      case "=":
        if (fileContent[i + 1] === "=") {
          tokens.push({ type: "EQUAL_EQUAL", lexeme: "==", literal: null, line });
          i++;
        } else {
          tokens.push({ type: "EQUAL", lexeme: "=", literal: null, line });
        }
        break;
      case "!":
        if (fileContent[i + 1] === "=") {
          tokens.push({ type: "BANG_EQUAL", lexeme: "!=", literal: null, line });
          i++;
        } else {
          tokens.push({ type: "BANG", lexeme: "!", literal: null, line });
        }
        break;
      case "<":
        if (fileContent[i + 1] === "=") {
          tokens.push({ type: "LESS_EQUAL", lexeme: "<=", literal: null, line });
          i++;
        } else {
          tokens.push({ type: "LESS", lexeme: "<", literal: null, line });
        }
        break;
      case ">":
        if (fileContent[i + 1] === "=") {
          tokens.push({ type: "GREATER_EQUAL", lexeme: ">=", literal: null, line });
          i++;
        } else {
          tokens.push({ type: "GREATER", lexeme: ">", literal: null, line });
        }
        break;
      case "/":
        if (fileContent[i + 1] === "/") {
          while (i < fileContent.length && fileContent[i] !== "\n") {
            i++;
          }
          i--;
        } else {
          tokens.push({ type: "SLASH", lexeme: "/", literal: null, line });
        }
        break;
      case "\n":
        line++;
        break;
      case " ":
      case "\r":
      case "\t":
        break;
      case '"': {
        const start = i;
        i++;
        while (i < fileContent.length && fileContent[i] !== '"') {
          if (fileContent[i] === "\n") {
            line++;
          }
          i++;
        }
        if (i >= fileContent.length) {
          console.error(`[line ${line}] Error: Unterminated string.`);
          hadError = true;
        } else {
          const value = fileContent.slice(start + 1, i);
          tokens.push({ type: "STRING", lexeme: `"${value}"`, literal: value, line });
        }
        break;
      }
      default:
        if (isDigit(char)) {
          const start = i;
          while (isDigit(fileContent[i + 1])) {
            i++;
          }
          if (fileContent[i + 1] === "." && isDigit(fileContent[i + 2])) {
            i++;
            while (isDigit(fileContent[i + 1])) {
              i++;
            }
          }
          const lexeme = fileContent.slice(start, i + 1);
          const value = Number(lexeme);
          const literal = Number.isInteger(value) ? value.toFixed(1) : String(value);
          tokens.push({ type: "NUMBER", lexeme, literal, line });
        } else if (isAlpha(char)) {
          const start = i;
          while (isAlphaNumeric(fileContent[i + 1])) {
            i++;
          }
          const lexeme = fileContent.slice(start, i + 1);
          const type = keywords[lexeme] ?? "IDENTIFIER";
          tokens.push({ type, lexeme, literal: null, line });
        } else {
          console.error(`[line ${line}] Error: Unexpected character: ${char}`);
          hadError = true;
        }
        break;
    }
    i++;
  }

  tokens.push({ type: "EOF", lexeme: "", literal: null, line });

  return { tokens, hadError };
}

interface LiteralExpr {
  kind: "literal";
  value: string | number | boolean | null;
}

interface VariableExpr {
  kind: "variable";
  name: string;
  line: number;
}

interface GroupingExpr {
  kind: "grouping";
  expression: Expr;
}

interface UnaryExpr {
  kind: "unary";
  operator: string;
  right: Expr;
  line: number;
}

interface BinaryExpr {
  kind: "binary";
  operator: string;
  left: Expr;
  right: Expr;
  line: number;
}

type Expr = LiteralExpr | VariableExpr | GroupingExpr | UnaryExpr | BinaryExpr;
type Value = string | number | boolean | null;

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}

function printExpr(expr: Expr): string {
  if (expr.kind === "grouping") {
    return `(group ${printExpr(expr.expression)})`;
  }
  if (expr.kind === "unary") {
    return `(${expr.operator} ${printExpr(expr.right)})`;
  }
  if (expr.kind === "binary") {
    return `(${expr.operator} ${printExpr(expr.left)} ${printExpr(expr.right)})`;
  }
  if (expr.kind === "variable") {
    return expr.name;
  }
  if (expr.value === null) {
    return "nil";
  }
  if (typeof expr.value === "number") {
    return formatNumber(expr.value);
  }
  return String(expr.value);
}

function isTruthy(value: Value): boolean {
  if (value === null) {
    return false;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return true;
}

class RuntimeError extends Error {
  line: number;

  constructor(line: number, message: string) {
    super(message);
    this.line = line;
  }
}

function evaluate(expr: Expr, environment: Map<string, Value>): Value {
  if (expr.kind === "literal") {
    return expr.value;
  }
  if (expr.kind === "variable") {
    return environment.get(expr.name) as Value;
  }
  if (expr.kind === "grouping") {
    return evaluate(expr.expression, environment);
  }
  if (expr.kind === "unary") {
    const right = evaluate(expr.right, environment);
    if (expr.operator === "-") {
      if (typeof right !== "number") {
        throw new RuntimeError(expr.line, "Operand must be a number.");
      }
      return -right;
    }
    return !isTruthy(right);
  }
  if (expr.kind === "binary") {
    const left = evaluate(expr.left, environment);
    const right = evaluate(expr.right, environment);
    if (expr.operator === "*") {
      if (typeof left !== "number" || typeof right !== "number") {
        throw new RuntimeError(expr.line, "Operands must be numbers.");
      }
      return left * right;
    }
    if (expr.operator === "/") {
      if (typeof left !== "number" || typeof right !== "number") {
        throw new RuntimeError(expr.line, "Operands must be numbers.");
      }
      return left / right;
    }
    if (expr.operator === "+") {
      if (typeof left === "number" && typeof right === "number") {
        return left + right;
      }
      if (typeof left === "string" && typeof right === "string") {
        return left + right;
      }
      throw new RuntimeError(expr.line, "Operands must be two numbers or two strings.");
    }
    if (expr.operator === "-") {
      if (typeof left !== "number" || typeof right !== "number") {
        throw new RuntimeError(expr.line, "Operands must be numbers.");
      }
      return left - right;
    }
    if (expr.operator === ">") {
      if (typeof left !== "number" || typeof right !== "number") {
        throw new RuntimeError(expr.line, "Operands must be numbers.");
      }
      return left > right;
    }
    if (expr.operator === ">=") {
      if (typeof left !== "number" || typeof right !== "number") {
        throw new RuntimeError(expr.line, "Operands must be numbers.");
      }
      return left >= right;
    }
    if (expr.operator === "<") {
      if (typeof left !== "number" || typeof right !== "number") {
        throw new RuntimeError(expr.line, "Operands must be numbers.");
      }
      return left < right;
    }
    if (expr.operator === "<=") {
      if (typeof left !== "number" || typeof right !== "number") {
        throw new RuntimeError(expr.line, "Operands must be numbers.");
      }
      return left <= right;
    }
    if (expr.operator === "==") {
      return left === right;
    }
    if (expr.operator === "!=") {
      return left !== right;
    }
  }
  throw new Error(`Cannot evaluate expression of kind: ${expr.kind}`);
}

function stringify(value: Value): string {
  if (value === null) {
    return "nil";
  }
  return String(value);
}

class ParseError extends Error {
  constructor(token: Token, message = "Expect expression.") {
    const where = token.type === "EOF" ? "end" : `'${token.lexeme}'`;
    super(`[line ${token.line}] Error at ${where}: ${message}`);
  }
}

interface PrintStmt {
  kind: "print";
  expression: Expr;
}

interface ExpressionStmt {
  kind: "expression";
  expression: Expr;
}

interface VarStmt {
  kind: "var";
  name: string;
  initializer: Expr;
}

type Stmt = PrintStmt | ExpressionStmt | VarStmt;

function execute(stmt: Stmt, environment: Map<string, Value>): void {
  if (stmt.kind === "print") {
    console.log(stringify(evaluate(stmt.expression, environment)));
  } else if (stmt.kind === "var") {
    environment.set(stmt.name, evaluate(stmt.initializer, environment));
  } else {
    evaluate(stmt.expression, environment);
  }
}

class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Expr {
    return this.equality();
  }

  parseProgram(): Stmt[] {
    const statements: Stmt[] = [];
    while (this.tokens[this.current].type !== "EOF") {
      statements.push(this.statement());
    }
    return statements;
  }

  private consume(type: string, message: string): Token {
    const token = this.tokens[this.current];
    if (token.type !== type) {
      throw new ParseError(token, message);
    }
    this.current++;
    return token;
  }

  private statement(): Stmt {
    if (this.tokens[this.current].type === "VAR") {
      return this.varDeclaration();
    }
    if (this.tokens[this.current].type === "PRINT") {
      this.current++;
      const expression = this.equality();
      this.consume("SEMICOLON", "Expect ';' after value.");
      return { kind: "print", expression };
    }
    const expression = this.equality();
    this.consume("SEMICOLON", "Expect ';' after expression.");
    return { kind: "expression", expression };
  }

  private varDeclaration(): VarStmt {
    this.current++;
    const name = this.consume("IDENTIFIER", "Expect variable name.");
    this.consume("EQUAL", "Expect '=' after variable name.");
    const initializer = this.equality();
    this.consume("SEMICOLON", "Expect ';' after variable declaration.");
    return { kind: "var", name: name.lexeme, initializer };
  }

  private equality(): Expr {
    let expr = this.comparison();
    while (
      this.tokens[this.current].type === "EQUAL_EQUAL" ||
      this.tokens[this.current].type === "BANG_EQUAL"
    ) {
      const operator = this.tokens[this.current].lexeme;
      const line = this.tokens[this.current].line;
      this.current++;
      const right = this.comparison();
      expr = { kind: "binary", operator, left: expr, right, line };
    }
    return expr;
  }

  private comparison(): Expr {
    let expr = this.term();
    while (
      this.tokens[this.current].type === "GREATER" ||
      this.tokens[this.current].type === "GREATER_EQUAL" ||
      this.tokens[this.current].type === "LESS" ||
      this.tokens[this.current].type === "LESS_EQUAL"
    ) {
      const operator = this.tokens[this.current].lexeme;
      const line = this.tokens[this.current].line;
      this.current++;
      const right = this.term();
      expr = { kind: "binary", operator, left: expr, right, line };
    }
    return expr;
  }

  private term(): Expr {
    let expr = this.factor();
    while (this.tokens[this.current].type === "PLUS" || this.tokens[this.current].type === "MINUS") {
      const operator = this.tokens[this.current].lexeme;
      const line = this.tokens[this.current].line;
      this.current++;
      const right = this.factor();
      expr = { kind: "binary", operator, left: expr, right, line };
    }
    return expr;
  }

  private factor(): Expr {
    let expr = this.unary();
    while (this.tokens[this.current].type === "SLASH" || this.tokens[this.current].type === "STAR") {
      const operator = this.tokens[this.current].lexeme;
      const line = this.tokens[this.current].line;
      this.current++;
      const right = this.unary();
      expr = { kind: "binary", operator, left: expr, right, line };
    }
    return expr;
  }

  private unary(): Expr {
    const token = this.tokens[this.current];
    if (token.type === "BANG" || token.type === "MINUS") {
      this.current++;
      const right = this.unary();
      return { kind: "unary", operator: token.lexeme, right, line: token.line };
    }
    return this.primary();
  }

  private primary(): Expr {
    const token = this.tokens[this.current];
    switch (token.type) {
      case "FALSE":
        this.current++;
        return { kind: "literal", value: false };
      case "TRUE":
        this.current++;
        return { kind: "literal", value: true };
      case "NIL":
        this.current++;
        return { kind: "literal", value: null };
      case "NUMBER":
        this.current++;
        return { kind: "literal", value: Number(token.lexeme) };
      case "STRING":
        this.current++;
        return { kind: "literal", value: token.literal };
      case "IDENTIFIER":
        this.current++;
        return { kind: "variable", name: token.lexeme, line: token.line };
      case "LEFT_PAREN": {
        this.current++;
        const expression = this.equality();
        this.current++; // consume RIGHT_PAREN
        return { kind: "grouping", expression };
      }
    }
    throw new ParseError(token);
  }
}

const args: string[] = process.argv.slice(2); // Skip the first two arguments (node path and script path)

if (args.length < 2) {
  console.error("Usage: ./your_program.sh tokenize <filename>");
  process.exit(1);
}

const command: string = args[0];

if (command !== "tokenize" && command !== "parse" && command !== "evaluate" && command !== "run") {
  console.error(`Usage: Unknown command: ${command}`);
  process.exit(1);
}

const filename: string = args[1];

const fileContent: string = fs.readFileSync(filename, "utf8");

const { tokens, hadError } = scan(fileContent);

if (command === "tokenize") {
  console.log(
    tokens.map((token) => `${token.type} ${token.lexeme} ${token.literal ?? "null"}`).join("\n")
  );

  if (hadError) {
    process.exit(65);
  }
} else if (command === "parse") {
  const parser = new Parser(tokens);
  try {
    const expr = parser.parse();
    console.log(printExpr(expr));
  } catch (error) {
    if (error instanceof ParseError) {
      console.error(error.message);
      process.exit(65);
    }
    throw error;
  }
} else if (command === "evaluate") {
  const parser = new Parser(tokens);
  try {
    const expr = parser.parse();
    console.log(stringify(evaluate(expr, new Map())));
  } catch (error) {
    if (error instanceof ParseError) {
      console.error(error.message);
      process.exit(65);
    }
    if (error instanceof RuntimeError) {
      console.error(error.message);
      console.error(`[line ${error.line}]`);
      process.exit(70);
    }
    throw error;
  }
} else {
  const parser = new Parser(tokens);
  try {
    const statements = parser.parseProgram();
    const environment = new Map<string, Value>();
    for (const statement of statements) {
      execute(statement, environment);
    }
  } catch (error) {
    if (error instanceof ParseError) {
      console.error(error.message);
      process.exit(65);
    }
    if (error instanceof RuntimeError) {
      console.error(error.message);
      console.error(`[line ${error.line}]`);
      process.exit(70);
    }
    throw error;
  }
}
