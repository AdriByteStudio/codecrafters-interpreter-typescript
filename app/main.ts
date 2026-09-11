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

interface AssignExpr {
  kind: "assign";
  name: string;
  value: Expr;
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

interface LogicalExpr {
  kind: "logical";
  operator: string;
  left: Expr;
  right: Expr;
  line: number;
}

interface CallExpr {
  kind: "call";
  callee: Expr;
  args: Expr[];
  line: number;
}

interface GetExpr {
  kind: "get";
  object: Expr;
  name: string;
  line: number;
}

interface SetExpr {
  kind: "set";
  object: Expr;
  name: string;
  value: Expr;
  line: number;
}

type Expr = LiteralExpr | VariableExpr | AssignExpr | GroupingExpr | UnaryExpr | BinaryExpr | LogicalExpr | CallExpr | GetExpr | SetExpr;
type Value = string | number | boolean | null | LoxCallable | LoxInstance;

interface LoxCallable {
  arity(): number;
  call(args: Value[]): Value;
  toString(): string;
}

function isCallable(value: Value): value is LoxCallable {
  return typeof value === "object" && value !== null && "call" in value;
}

class Clock implements LoxCallable {
  arity(): number {
    return 0;
  }
  call(_args: Value[]): Value {
    return Date.now() / 1000;
  }
  toString(): string {
    return "<native fn>";
  }
}

class LoxFunction implements LoxCallable {
  private name: string;
  private params: string[];
  private body: Stmt[];
  private closure: Environment;

  constructor(name: string, params: string[], body: Stmt[], closure: Environment) {
    this.name = name;
    this.params = params;
    this.body = body;
    this.closure = closure;
  }

  arity(): number {
    return this.params.length;
  }

  call(args: Value[]): Value {
    const environment = new Environment(this.closure);
    for (let i = 0; i < this.params.length; i++) {
      environment.define(this.params[i], args[i]);
    }
    try {
      for (const statement of this.body) {
        execute(statement, environment);
      }
    } catch (error) {
      if (error instanceof ReturnSignal) {
        return error.value;
      }
      throw error;
    }
    return null;
  }

  toString(): string {
    return `<fn ${this.name}>`;
  }
}

class LoxClass implements LoxCallable {
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  arity(): number {
    return 0;
  }

  call(_args: Value[]): Value {
    return new LoxInstance(this);
  }

  toString(): string {
    return this.name;
  }
}

class LoxInstance {
  private klass: LoxClass;
  private fields = new Map<string, Value>();

  constructor(klass: LoxClass) {
    this.klass = klass;
  }

  get(name: string, line: number): Value {
    const value = this.fields.get(name);
    if (value !== undefined) {
      return value;
    }
    throw new RuntimeError(line, `Undefined property '${name}'.`);
  }

  set(name: string, value: Value): void {
    this.fields.set(name, value);
  }

  toString(): string {
    return `${this.klass.name} instance`;
  }
}

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
  if (expr.kind === "logical") {
    return `(${expr.operator} ${printExpr(expr.left)} ${printExpr(expr.right)})`;
  }
  if (expr.kind === "call") {
    return `(${printExpr(expr.callee)}${expr.args.map((arg) => ` ${printExpr(arg)}`).join("")})`;
  }
  if (expr.kind === "variable") {
    return expr.name;
  }
  if (expr.kind === "assign") {
    return `(= ${expr.name} ${printExpr(expr.value)})`;
  }
  if (expr.kind === "get") {
    return `(${printExpr(expr.object)}.${expr.name})`;
  }
  if (expr.kind === "set") {
    return `(= ${printExpr(expr.object)}.${expr.name} ${printExpr(expr.value)})`;
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

class ReturnSignal extends Error {
  value: Value;

  constructor(value: Value) {
    super();
    this.value = value;
  }
}

class Environment {
  private values = new Map<string, Value>();
  private enclosing?: Environment;

  constructor(enclosing?: Environment) {
    this.enclosing = enclosing;
  }

  define(name: string, value: Value): void {
    this.values.set(name, value);
  }

  get(name: string, line: number): Value {
    if (this.values.has(name)) {
      return this.values.get(name) as Value;
    }
    if (this.enclosing !== undefined) {
      return this.enclosing.get(name, line);
    }
    throw new RuntimeError(line, `Undefined variable '${name}'.`);
  }

  assign(name: string, value: Value, line: number): void {
    if (this.values.has(name)) {
      this.values.set(name, value);
      return;
    }
    if (this.enclosing !== undefined) {
      this.enclosing.assign(name, value, line);
      return;
    }
    throw new RuntimeError(line, `Undefined variable '${name}'.`);
  }

  getAt(distance: number, name: string): Value {
    return this.ancestor(distance).values.get(name) as Value;
  }

  assignAt(distance: number, name: string, value: Value): void {
    this.ancestor(distance).values.set(name, value);
  }

  private ancestor(distance: number): Environment {
    let environment: Environment = this;
    for (let i = 0; i < distance; i++) {
      environment = environment.enclosing as Environment;
    }
    return environment;
  }
}

function createGlobalEnvironment(): Environment {
  const environment = new Environment();
  environment.define("clock", new Clock());
  return environment;
}

const locals = new Map<Expr, number>();
let globals: Environment;

function evaluate(expr: Expr, environment: Environment): Value {
  if (expr.kind === "literal") {
    return expr.value;
  }
  if (expr.kind === "variable") {
    const distance = locals.get(expr);
    if (distance !== undefined) {
      return environment.getAt(distance, expr.name);
    }
    return globals.get(expr.name, expr.line);
  }
  if (expr.kind === "assign") {
    const value = evaluate(expr.value, environment);
    const distance = locals.get(expr);
    if (distance !== undefined) {
      environment.assignAt(distance, expr.name, value);
    } else {
      globals.assign(expr.name, value, expr.line);
    }
    return value;
  }
  if (expr.kind === "grouping") {
    return evaluate(expr.expression, environment);
  }
  if (expr.kind === "logical") {
    const left = evaluate(expr.left, environment);
    if (expr.operator === "or") {
      if (isTruthy(left)) {
        return left;
      }
      return evaluate(expr.right, environment);
    }
    if (expr.operator === "and") {
      if (!isTruthy(left)) {
        return left;
      }
      return evaluate(expr.right, environment);
    }
  }
  if (expr.kind === "call") {
    const callee = evaluate(expr.callee, environment);
    const args: Value[] = [];
    for (const arg of expr.args) {
      args.push(evaluate(arg, environment));
    }
    if (!isCallable(callee)) {
      throw new RuntimeError(expr.line, "Can only call functions and classes.");
    }
    if (args.length !== callee.arity()) {
      throw new RuntimeError(expr.line, `Expected ${callee.arity()} arguments but got ${args.length}.`);
    }
    return callee.call(args);
  }
  if (expr.kind === "get") {
    const object = evaluate(expr.object, environment);
    if (object instanceof LoxInstance) {
      return object.get(expr.name, expr.line);
    }
    throw new RuntimeError(expr.line, "Only instances have properties.");
  }
  if (expr.kind === "set") {
    const object = evaluate(expr.object, environment);
    if (!(object instanceof LoxInstance)) {
      throw new RuntimeError(expr.line, "Only instances have fields.");
    }
    const value = evaluate(expr.value, environment);
    object.set(expr.name, value);
    return value;
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
  if (isCallable(value)) {
    return value.toString();
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
  line: number;
}

interface BlockStmt {
  kind: "block";
  statements: Stmt[];
}

interface IfStmt {
  kind: "if";
  condition: Expr;
  thenBranch: Stmt;
  elseBranch: Stmt | null;
}

interface WhileStmt {
  kind: "while";
  condition: Expr;
  body: Stmt;
}

interface ForStmt {
  kind: "for";
  initializer: Stmt | null;
  condition: Expr | null;
  increment: Expr | null;
  body: Stmt;
}

interface FunctionStmt {
  kind: "function";
  name: string;
  params: string[];
  paramLines: number[];
  body: Stmt[];
  line: number;
}

interface ReturnStmt {
  kind: "return";
  value: Expr | null;
  line: number;
}

interface ClassStmt {
  kind: "class";
  name: string;
  methods: FunctionStmt[];
  line: number;
}

type Stmt = PrintStmt | ExpressionStmt | VarStmt | BlockStmt | IfStmt | WhileStmt | ForStmt | FunctionStmt | ReturnStmt | ClassStmt;

function execute(stmt: Stmt, environment: Environment): void {
  if (stmt.kind === "print") {
    console.log(stringify(evaluate(stmt.expression, environment)));
  } else if (stmt.kind === "var") {
    environment.define(stmt.name, evaluate(stmt.initializer, environment));
  } else if (stmt.kind === "block") {
    const blockEnvironment = new Environment(environment);
    for (const statement of stmt.statements) {
      execute(statement, blockEnvironment);
    }
  } else if (stmt.kind === "if") {
    if (isTruthy(evaluate(stmt.condition, environment))) {
      execute(stmt.thenBranch, environment);
    } else if (stmt.elseBranch !== null) {
      execute(stmt.elseBranch, environment);
    }
  } else if (stmt.kind === "while") {
    while (isTruthy(evaluate(stmt.condition, environment))) {
      execute(stmt.body, environment);
    }
  } else if (stmt.kind === "for") {
    const forEnvironment = new Environment(environment);
    if (stmt.initializer !== null) {
      execute(stmt.initializer, forEnvironment);
    }
    while (stmt.condition === null || isTruthy(evaluate(stmt.condition, forEnvironment))) {
      execute(stmt.body, forEnvironment);
      if (stmt.increment !== null) {
        evaluate(stmt.increment, forEnvironment);
      }
    }
  } else if (stmt.kind === "function") {
    const fn = new LoxFunction(stmt.name, stmt.params, stmt.body, environment);
    environment.define(stmt.name, fn);
  } else if (stmt.kind === "class") {
    const cls = new LoxClass(stmt.name);
    environment.define(stmt.name, cls);
  } else if (stmt.kind === "return") {
    const value = stmt.value !== null ? evaluate(stmt.value, environment) : null;
    throw new ReturnSignal(value);
  } else {
    evaluate(stmt.expression, environment);
  }
}

class Parser {
  private tokens: Token[];
  private current = 0;
  hadError = false;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Expr {
    return this.assignment();
  }

  parseProgram(): Stmt[] {
    const statements: Stmt[] = [];
    while (!this.isAtEnd()) {
      const statement = this.declaration();
      if (statement !== null) {
        statements.push(statement);
      }
    }
    return statements;
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.tokens[this.current].type === "EOF";
  }

  private declaration(): Stmt | null {
    try {
      if (this.tokens[this.current].type === "CLASS") {
        return this.classDeclaration();
      }
      if (this.tokens[this.current].type === "FUN") {
        return this.functionDeclaration();
      }
      if (this.tokens[this.current].type === "VAR") {
        return this.varDeclaration();
      }
      return this.statement();
    } catch (error) {
      if (error instanceof ParseError) {
        this.hadError = true;
        console.error(error.message);
        this.synchronize();
        return null;
      }
      throw error;
    }
  }

  private synchronize(): void {
    this.current++;
    while (!this.isAtEnd()) {
      if (this.tokens[this.current - 1].type === "SEMICOLON") {
        return;
      }
      const type = this.tokens[this.current].type;
      if (
        type === "CLASS" ||
        type === "FUN" ||
        type === "VAR" ||
        type === "FOR" ||
        type === "IF" ||
        type === "WHILE" ||
        type === "PRINT" ||
        type === "RETURN"
      ) {
        return;
      }
      this.current++;
    }
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
    if (this.tokens[this.current].type === "LEFT_BRACE") {
      this.current++;
      return { kind: "block", statements: this.block() };
    }
    if (this.tokens[this.current].type === "IF") {
      return this.ifStatement();
    }
    if (this.tokens[this.current].type === "WHILE") {
      return this.whileStatement();
    }
    if (this.tokens[this.current].type === "FOR") {
      return this.forStatement();
    }
    if (this.tokens[this.current].type === "PRINT") {
      this.current++;
      const expression = this.assignment();
      this.consume("SEMICOLON", "Expect ';' after value.");
      return { kind: "print", expression };
    }
    if (this.tokens[this.current].type === "RETURN") {
      return this.returnStatement();
    }
    const expression = this.assignment();
    this.consume("SEMICOLON", "Expect ';' after expression.");
    return { kind: "expression", expression };
  }

  private returnStatement(): ReturnStmt {
    const keyword = this.tokens[this.current];
    this.current++;
    let value: Expr | null = null;
    if (this.tokens[this.current].type !== "SEMICOLON") {
      value = this.assignment();
    }
    this.consume("SEMICOLON", "Expect ';' after return value.");
    return { kind: "return", value, line: keyword.line };
  }

  private forStatement(): ForStmt {
    this.current++;
    this.consume("LEFT_PAREN", "Expect '(' after 'for'.");

    let initializer: Stmt | null = null;
    if (this.tokens[this.current].type === "SEMICOLON") {
      this.current++;
    } else if (this.tokens[this.current].type === "VAR") {
      initializer = this.varDeclaration();
    } else {
      const expression = this.assignment();
      this.consume("SEMICOLON", "Expect ';' after expression.");
      initializer = { kind: "expression", expression };
    }

    let condition: Expr | null = null;
    if (this.tokens[this.current].type !== "SEMICOLON") {
      condition = this.assignment();
    }
    this.consume("SEMICOLON", "Expect ';' after loop condition.");

    let increment: Expr | null = null;
    if (this.tokens[this.current].type !== "RIGHT_PAREN") {
      increment = this.assignment();
    }
    this.consume("RIGHT_PAREN", "Expect ')' after for clauses.");

    const body = this.statement();
    return { kind: "for", initializer, condition, increment, body };
  }

  private whileStatement(): WhileStmt {
    this.current++;
    this.consume("LEFT_PAREN", "Expect '(' after 'while'.");
    const condition = this.assignment();
    this.consume("RIGHT_PAREN", "Expect ')' after condition.");
    const body = this.statement();
    return { kind: "while", condition, body };
  }

  private ifStatement(): IfStmt {
    this.current++;
    this.consume("LEFT_PAREN", "Expect '(' after 'if'.");
    const condition = this.assignment();
    this.consume("RIGHT_PAREN", "Expect ')' after if condition.");
    const thenBranch = this.statement();
    let elseBranch: Stmt | null = null;
    if (this.tokens[this.current].type === "ELSE") {
      this.current++;
      elseBranch = this.statement();
    }
    return { kind: "if", condition, thenBranch, elseBranch };
  }

  private block(): Stmt[] {
    const statements: Stmt[] = [];
    while (this.tokens[this.current].type !== "RIGHT_BRACE" && this.tokens[this.current].type !== "EOF") {
      const statement = this.declaration();
      if (statement !== null) {
        statements.push(statement);
      }
    }
    this.consume("RIGHT_BRACE", "Expect '}' after block.");
    return statements;
  }

  private functionDeclaration(): FunctionStmt {
    this.current++; // consume 'fun'
    return this.functionBody("function");
  }

  private functionBody(kind: string): FunctionStmt {
    const line = this.tokens[this.current].line;
    const name = this.consume("IDENTIFIER", `Expect ${kind} name.`);
    this.consume("LEFT_PAREN", `Expect '(' after ${kind} name.`);
    const params: string[] = [];
    const paramLines: number[] = [];
    if (this.tokens[this.current].type !== "RIGHT_PAREN") {
      do {
        const param = this.consume("IDENTIFIER", "Expect parameter name.");
        params.push(param.lexeme);
        paramLines.push(param.line);
      } while (this.tokens[this.current].type === "COMMA" && (this.current++, true));
    }
    this.consume("RIGHT_PAREN", "Expect ')' after parameters.");
    this.consume("LEFT_BRACE", "Expect '{' before function body.");
    const body = this.block();
    return { kind: "function", name: name.lexeme, params, paramLines, body, line };
  }

  private classDeclaration(): ClassStmt {
    const line = this.tokens[this.current].line;
    this.current++; // consume 'class'
    const name = this.consume("IDENTIFIER", "Expect class name.");
    this.consume("LEFT_BRACE", "Expect '{' before class body.");
    const methods: FunctionStmt[] = [];
    while (this.tokens[this.current].type !== "RIGHT_BRACE" && this.tokens[this.current].type !== "EOF") {
      methods.push(this.functionBody("method"));
    }
    this.consume("RIGHT_BRACE", "Expect '}' after class body.");
    return { kind: "class", name: name.lexeme, methods, line };
  }

  private varDeclaration(): VarStmt {
    const line = this.tokens[this.current].line;
    this.current++;
    const name = this.consume("IDENTIFIER", "Expect variable name.");
    let initializer: Expr = { kind: "literal", value: null };
    if (this.tokens[this.current].type === "EQUAL") {
      this.current++;
      initializer = this.assignment();
    }
    this.consume("SEMICOLON", "Expect ';' after variable declaration.");
    return { kind: "var", name: name.lexeme, initializer, line };
  }

  private assignment(): Expr {
    const expr = this.or();
    if (this.tokens[this.current].type !== "EQUAL") {
      return expr;
    }

    const equals = this.tokens[this.current];
    this.current++;
    const value = this.assignment();
    if (expr.kind === "variable") {
      return { kind: "assign", name: expr.name, value, line: equals.line };
    }
    if (expr.kind === "get") {
      return { kind: "set", object: expr.object, name: expr.name, value, line: equals.line };
    }
    throw new ParseError(equals, "Invalid assignment target.");
  }

  private or(): Expr {
    let expr = this.and();
    while (this.tokens[this.current].type === "OR") {
      const operator = this.tokens[this.current].lexeme;
      const line = this.tokens[this.current].line;
      this.current++;
      const right = this.and();
      expr = { kind: "logical", operator, left: expr, right, line };
    }
    return expr;
  }

  private and(): Expr {
    let expr = this.equality();
    while (this.tokens[this.current].type === "AND") {
      const operator = this.tokens[this.current].lexeme;
      const line = this.tokens[this.current].line;
      this.current++;
      const right = this.equality();
      expr = { kind: "logical", operator, left: expr, right, line };
    }
    return expr;
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
    return this.call();
  }

  private call(): Expr {
    let expr = this.primary();
    while (true) {
      if (this.tokens[this.current].type === "LEFT_PAREN") {
        this.current++;
        const args: Expr[] = [];
        if (this.tokens[this.current].type !== "RIGHT_PAREN") {
          args.push(this.assignment());
          while (this.tokens[this.current].type === "COMMA") {
            this.current++;
            args.push(this.assignment());
          }
        }
        const paren = this.consume("RIGHT_PAREN", "Expect ')' after arguments.");
        expr = { kind: "call", callee: expr, args, line: paren.line };
      } else if (this.tokens[this.current].type === "DOT") {
        this.current++;
        const name = this.consume("IDENTIFIER", "Expect property name after '.'.");
        expr = { kind: "get", object: expr, name: name.lexeme, line: name.line };
      } else {
        break;
      }
    }
    return expr;
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
        const expression = this.assignment();
        this.consume("RIGHT_PAREN", "Expect ')' after expression.");
        return { kind: "grouping", expression };
      }
    }
    throw new ParseError(token);
  }
}

class Resolver {
  private scopes: Array<Map<string, boolean>> = [];
  private currentFunction: "none" | "function" = "none";
  hadError = false;

  resolve(statements: Stmt[]): void {
    for (const statement of statements) {
      this.resolveStmt(statement);
    }
  }

  private resolveStmt(stmt: Stmt): void {
    if (stmt.kind === "block") {
      this.beginScope();
      this.resolve(stmt.statements);
      this.endScope();
    } else if (stmt.kind === "var") {
      this.declare(stmt.name, stmt.line);
      this.resolveExpr(stmt.initializer);
      this.define(stmt.name);
    } else if (stmt.kind === "function") {
      this.declare(stmt.name, stmt.line);
      this.define(stmt.name);
      this.resolveFunction(stmt);
    } else if (stmt.kind === "class") {
      this.declare(stmt.name, stmt.line);
      this.define(stmt.name);
      for (const method of stmt.methods) {
        this.resolveFunction(method);
      }
    } else if (stmt.kind === "expression") {
      this.resolveExpr(stmt.expression);
    } else if (stmt.kind === "if") {
      this.resolveExpr(stmt.condition);
      this.resolveStmt(stmt.thenBranch);
      if (stmt.elseBranch !== null) {
        this.resolveStmt(stmt.elseBranch);
      }
    } else if (stmt.kind === "print") {
      this.resolveExpr(stmt.expression);
    } else if (stmt.kind === "return") {
      if (this.currentFunction === "none") {
        this.hadError = true;
        console.error(`[line ${stmt.line}] Error at 'return': Can't return from top-level code.`);
      }
      if (stmt.value !== null) {
        this.resolveExpr(stmt.value);
      }
    } else if (stmt.kind === "while") {
      this.resolveExpr(stmt.condition);
      this.resolveStmt(stmt.body);
    } else if (stmt.kind === "for") {
      this.beginScope();
      if (stmt.initializer !== null) {
        this.resolveStmt(stmt.initializer);
      }
      if (stmt.condition !== null) {
        this.resolveExpr(stmt.condition);
      }
      if (stmt.increment !== null) {
        this.resolveExpr(stmt.increment);
      }
      this.resolveStmt(stmt.body);
      this.endScope();
    }
  }

  private resolveExpr(expr: Expr): void {
    if (expr.kind === "variable") {
      const scope = this.scopes[this.scopes.length - 1];
      if (scope !== undefined && scope.get(expr.name) === false) {
        this.hadError = true;
        console.error(`[line ${expr.line}] Error at '${expr.name}': Can't read local variable in its own initializer.`);
      }
      this.resolveLocal(expr, expr.name);
    } else if (expr.kind === "assign") {
      this.resolveExpr(expr.value);
      this.resolveLocal(expr, expr.name);
    } else if (expr.kind === "literal") {
      // nothing to resolve
    } else if (expr.kind === "grouping") {
      this.resolveExpr(expr.expression);
    } else if (expr.kind === "unary") {
      this.resolveExpr(expr.right);
    } else if (expr.kind === "binary") {
      this.resolveExpr(expr.left);
      this.resolveExpr(expr.right);
    } else if (expr.kind === "logical") {
      this.resolveExpr(expr.left);
      this.resolveExpr(expr.right);
    } else if (expr.kind === "call") {
      this.resolveExpr(expr.callee);
      for (const arg of expr.args) {
        this.resolveExpr(arg);
      }
    } else if (expr.kind === "get") {
      this.resolveExpr(expr.object);
    } else if (expr.kind === "set") {
      this.resolveExpr(expr.value);
      this.resolveExpr(expr.object);
    }
  }

  private resolveFunction(stmt: FunctionStmt): void {
    const enclosingFunction = this.currentFunction;
    this.currentFunction = "function";
    this.beginScope();
    for (let i = 0; i < stmt.params.length; i++) {
      this.declare(stmt.params[i], stmt.paramLines[i]);
      this.define(stmt.params[i]);
    }
    this.resolve(stmt.body);
    this.endScope();
    this.currentFunction = enclosingFunction;
  }

  private beginScope(): void {
    this.scopes.push(new Map());
  }

  private endScope(): void {
    this.scopes.pop();
  }

  private declare(name: string, line: number): void {
    if (this.scopes.length === 0) {
      return;
    }
    const scope = this.scopes[this.scopes.length - 1];
    if (scope.has(name)) {
      this.hadError = true;
      console.error(`[line ${line}] Error at '${name}': Already a variable with this name in this scope.`);
    }
    scope.set(name, false);
  }

  private define(name: string): void {
    if (this.scopes.length === 0) {
      return;
    }
    this.scopes[this.scopes.length - 1].set(name, true);
  }

  private resolveLocal(expr: Expr, name: string): void {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name)) {
        locals.set(expr, this.scopes.length - 1 - i);
        return;
      }
    }
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
    globals = createGlobalEnvironment();
    console.log(stringify(evaluate(expr, globals)));
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
  const statements = parser.parseProgram();
  if (parser.hadError) {
    process.exit(65);
  }
  const resolver = new Resolver();
  locals.clear();
  resolver.resolve(statements);
  if (resolver.hadError) {
    process.exit(65);
  }
  globals = createGlobalEnvironment();
  try {
    for (const statement of statements) {
      execute(statement, globals);
    }
  } catch (error) {
    if (error instanceof RuntimeError) {
      console.error(error.message);
      console.error(`[line ${error.line}]`);
      process.exit(70);
    }
    throw error;
  }
}
