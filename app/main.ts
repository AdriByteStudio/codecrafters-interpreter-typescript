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

type Expr = LiteralExpr;

function printExpr(expr: Expr): string {
  if (expr.value === null) {
    return "nil";
  }
  return String(expr.value);
}

class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Expr {
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
    }
    throw new Error(`Unexpected token: ${token.lexeme}`);
  }
}

const args: string[] = process.argv.slice(2); // Skip the first two arguments (node path and script path)

if (args.length < 2) {
  console.error("Usage: ./your_program.sh tokenize <filename>");
  process.exit(1);
}

const command: string = args[0];

if (command !== "tokenize" && command !== "parse") {
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
} else {
  const parser = new Parser(tokens);
  const expr = parser.parse();
  console.log(printExpr(expr));
}
