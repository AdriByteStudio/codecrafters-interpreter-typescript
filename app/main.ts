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

for (const char of fileContent) {
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
  }
}

tokens.push("EOF  null");

console.log(tokens.join("\n"));
