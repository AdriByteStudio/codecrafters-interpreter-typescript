import fs from "fs";

const args: string[] = process.argv.slice(2); // Skip the first two arguments (node path and script path)

if (args.length < 2) {
  console.error("Usage: ./your_program.sh tokenize <filename>");
  process.exit(1);
}

const command: string = args[0];

if (command !== "tokenize") {
  console.error(`Usage: Unknown command: ${command}`);
  process.exit(1);
}

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.error("Logs from your program will appear here!");

const filename: string = args[1];

const fileContent: string = fs.readFileSync(filename, "utf8");

const tokens: string[] = [];
let hadError = false;
let line = 1;
let i = 0;

function isDigit(char: string | undefined): boolean {
  return char !== undefined && char >= "0" && char <= "9";
}

while (i < fileContent.length) {
  const char = fileContent[i];
  switch (char) {
    case "(":
      tokens.push("LEFT_PAREN ( null");
      break;
    case ")":
      tokens.push("RIGHT_PAREN ) null");
      break;
    case "{":
      tokens.push("LEFT_BRACE { null");
      break;
    case "}":
      tokens.push("RIGHT_BRACE } null");
      break;
    case ",":
      tokens.push("COMMA , null");
      break;
    case ".":
      tokens.push("DOT . null");
      break;
    case "-":
      tokens.push("MINUS - null");
      break;
    case "+":
      tokens.push("PLUS + null");
      break;
    case ";":
      tokens.push("SEMICOLON ; null");
      break;
    case "*":
      tokens.push("STAR * null");
      break;
    case "=":
      if (fileContent[i + 1] === "=") {
        tokens.push("EQUAL_EQUAL == null");
        i++;
      } else {
        tokens.push("EQUAL = null");
      }
      break;
    case "!":
      if (fileContent[i + 1] === "=") {
        tokens.push("BANG_EQUAL != null");
        i++;
      } else {
        tokens.push("BANG ! null");
      }
      break;
    case "<":
      if (fileContent[i + 1] === "=") {
        tokens.push("LESS_EQUAL <= null");
        i++;
      } else {
        tokens.push("LESS < null");
      }
      break;
    case ">":
      if (fileContent[i + 1] === "=") {
        tokens.push("GREATER_EQUAL >= null");
        i++;
      } else {
        tokens.push("GREATER > null");
      }
      break;
    case "/":
      if (fileContent[i + 1] === "/") {
        while (i < fileContent.length && fileContent[i] !== "\n") {
          i++;
        }
        i--;
      } else {
        tokens.push("SLASH / null");
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
        tokens.push(`STRING "${value}" ${value}`);
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
        tokens.push(`NUMBER ${lexeme} ${literal}`);
      } else {
        console.error(`[line ${line}] Error: Unexpected character: ${char}`);
        hadError = true;
      }
      break;
  }
  i++;
}

tokens.push("EOF  null");

console.log(tokens.join("\n"));

if (hadError) {
  process.exit(65);
}
