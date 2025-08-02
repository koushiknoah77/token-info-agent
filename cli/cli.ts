import readline from "readline";
import fetch from "node-fetch";

const DEFAULT_BACKEND_URL = "http://localhost:3000/prompt";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("Token Info Shade Agent CLI");
console.log(
  "Select response format:\n" +
  "1. Plain Text\n" +
  "2. JSON\n" +
  "3. Markdown Table"
);

function formatChoiceToAccept(choice: string): string {
  switch (choice.trim()) {
    case "1": return "text/plain";
    case "2": return "application/json";
    case "3": return "text/markdown";
    default: return "text/plain";
  }
}

async function promptFormat(): Promise<string> {
  return new Promise((resolve) => {
    rl.question("Enter the number for desired format [1]: ", (answer) => {
      if (answer.trim() === "") {
        resolve("text/plain");
      } else {
        resolve(formatChoiceToAccept(answer));
      }
    });
  });
}

async function promptQuery(): Promise<string> {
  return new Promise((resolve) => {
    rl.question("Query> ", (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  const format = await promptFormat();
  const backendUrl = process.env.TOKEN_INFO_BACKEND_URL && process.env.TOKEN_INFO_BACKEND_URL.trim() !== ""
    ? process.env.TOKEN_INFO_BACKEND_URL
    : DEFAULT_BACKEND_URL;

  while (true) {
    const query = await promptQuery();
    if (!query || query.toLowerCase() === "exit" || query.toLowerCase() === "quit") {
      console.log("Exiting... Goodbye!");
      rl.close();
      process.exit(0);
    }

    try {
      const res = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": format,
        },
        body: JSON.stringify({ prompt: query }),
      });

      if (!res.ok) {
        console.log(`Error: Received status code ${res.status}`);
        continue;
      }

      if (format === "application/json") {
        const json = await res.json();
        console.log("\nResponse (JSON):");
        console.log(JSON.stringify(json, null, 2));
      } else {
        const text = await res.text();
        console.log("\nResponse:");
        console.log(text);
      }
    } catch (err) {
      console.error("Error fetching response:", err);
    }
  }
}

main();
