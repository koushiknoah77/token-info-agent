text
# Token Info Shade Agent

> An autonomous crypto token price agent that answers natural language queries about cryptocurrency prices, conversions, and historical data — powered by the CoinGecko API.  
> Built with a modern React frontend and a Node.js backend, featuring responsive design, token autocomplete, dark mode toggle, query history, multi-format output, and a CLI.

---

## Table of Contents

- [Demo](#demo)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Agent](#running-the-agent)
- [Usage](#usage)
  - [Web App](#web-app)
  - [Command Line Interface (CLI)](#command-line-interface-cli)
  - [API Endpoint](#api-endpoint)
- [Example Queries](#example-queries)
- [Project Structure](#project-structure)
- [Technical Details](#technical-details)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)
- [Contact](#contact)

---

## Demo

A demo video walkthrough illustrating the core features and usage:

- [demo.mp4](./demo.mp4)

You can try running it locally by following the instructions below.

---

## Features

- Natural language prompt parsing for token prices, conversions, and historical data  
- Detects tokens and fiat currencies with autocomplete and aliases  
- Fetches real-time and historical prices from CoinGecko API  
- Supports multi-token and multi-currency queries  
- Output formats: Plain Text, JSON, Markdown Table  
- Responsive and accessible React UI with dark/light theme toggle  
- Query history with quick reuse and clearing  
- Copy results to clipboard and download as JSON or CSV  
- Keyboard shortcuts: Enter to submit, Ctrl+Enter to copy  
- Autonomous backend with caching — no manual refresh needed  
- Command Line Interface (CLI) to query from terminal  

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher (includes npm)  
- Internet connection for live API calls  
- Optional (for CLI): `ts-node` and `typescript` installed globally to run TypeScript CLI directly

Install CLI prerequisites globally (optional):

npm install -g ts-node typescript

text

---

## Installation

### 1. Clone the Repository

git clone https://github.com/koushiknoah77/token-info-agent.git
cd token-info-agent

text

### 2. Backend Setup

cd backend
npm install
npx ts-node index.ts

text

The backend listens on [http://localhost:3000](http://localhost:3000) by default.

### 3. Frontend Setup

Open a new terminal, then:

cd ../frontend
npm install
npm run dev

text

Frontend available at [http://localhost:5173](http://localhost:5173).

> **Note:** To connect frontend to a backend running on a custom URL/port, add `.env` in `frontend` folder with:  
> `VITE_BACKEND_URL="http://your-backend-url:port/prompt"`

---

## Running the Agent

Once backend and frontend servers are running:

- Open your browser at `http://localhost:5173`.  
- Enter queries, select output format, and get live responses.

---

## Usage

### Web App

- Input natural language queries like:  
  - `"What’s the price of SOL?"`  
  - `"5 eth to usd"`  
  - `"convert 10 doge to btc"`  
  - `"price of bitcoin on 2023-06-01"`  
- Choose output format: Plain Text, JSON, or Markdown Table.  
- Submit using **Ask** button or Enter key.  
- Copy or download results; toggle light/dark mode; reuse from history.  
- Keyboard shortcuts:  
  - Enter – submit  
  - Ctrl+Enter – copy result

---

### Command Line Interface (CLI)

The Token Info Shade Agent features a CLI client for terminal queries.

#### Overview

- Select output format (Plain Text, JSON, or Markdown Table).  
- Input natural language queries.  
- View responses formatted accordingly.  
- Exit anytime with `exit` or `quit`.

#### Prerequisites

- Node.js v18+ installed  
- (Optional) `ts-node` and `typescript` globally installed to run TypeScript CLI without compiling:

npm install -g ts-node typescript

text

#### Run the CLI

1. Ensure the backend server is running.

2. Navigate to the `cli` folder:

cd cli

text

3. Run the CLI:

- Using `ts-node` (recommended for development):

ts-node cli.ts

text

- Or compile and run:

tsc cli.ts
node cli.js

text

4. Follow prompts to select format and enter queries.

5. To exit, type `exit` or `quit`.

#### Configuring Backend API Endpoint

By default, the CLI sends queries to:

http://localhost:3000/prompt

text

To override, set the environment variable before running:

- On Linux/macOS:

export TOKEN_INFO_BACKEND_URL="http://your-backend-url:port/prompt"

text

- On Windows CMD:

set TOKEN_INFO_BACKEND_URL=http://your-backend-url:port/prompt

text

---

### API Endpoint

Send POST requests to backend `/prompt` endpoint with:

- Headers:  
  - `Content-Type: application/json`  
  - `Accept: text/plain` (or `application/json`, `text/markdown`)  
- Body JSON:

{ "prompt": "your natural language query" }

text

**Sample curl request:**

curl -X POST http://localhost:3000/prompt
-H "Content-Type: application/json"
-H "Accept: text/plain"
-d '{"prompt":"what is the price of sol?"}'

text

---

## Example Queries

| Query                              | Description                                  | Output Formats          |
|-----------------------------------|----------------------------------------------|-------------------------|
| `price of sol`                    | Current Solana token price                   | Plain Text, JSON, Markdown   |
| `3 eth in usd`                    | Conversion of Ethereum to USD                | All formats             |
| `convert 10 doge to btc`          | Dogecoin to Bitcoin conversion               | All formats             |
| `price of bitcoin on 2023-06-01` | Historical Bitcoin price on specific date    | Plain Text, JSON        |

More query examples available in [`prompt_examples.txt`](./prompt_examples.txt).

---

## Project Structure

/token-info-agent/
├── backend/ # Node.js backend server (Hono)
├── frontend/ # React frontend app (TS/JS)
├── cli/ # Command Line Interface scripts (TS)
├── prompt_examples.txt # Sample queries and expected outputs
├── demo.mp4 # Demo video walkthrough
├── README.md # This README file
└── LICENSE # MIT License file

text

---

## Technical Details

- Backend: Node.js with Hono, TypeScript  
- Frontend: React with TypeScript and glassmorphic styling  
- CLI: Node.js with TypeScript, readline input, fetch API requests  
- Natural language parsing supports tokens, fiat, amounts, and dates  
- CoinGecko API integration, with caching for efficiency  
- UI Accessibility and keyboard navigability

---

## Troubleshooting

- Backend connection refused? Ensure backend is running with:

npx ts-node index.ts

text

- Token not recognized? Use correct tokens and aliases.

- Dark mode text not visible? Confirm latest CSS is applied and browser supports CSS variables.

- Port conflicts? Modify backend PORT env or frontend VITE_BACKEND_URL.

- `ts-node` missing? Install globally for CLI: 

npm install -g ts-node typescript

text

- API rate limits? CoinGecko enforces limits; spread requests over time.

---

## Contributing

Contributions are welcome. Please fork the repo, create a branch, commit your changes, and submit a pull request.

---

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

---

## Acknowledgments

- [CoinGecko API](https://www.coingecko.com/en/api)  
- [NEAR Shade Agents](https://docs.near.org/ai/shade-agents/introduction)  
- React, Hono, and other open source tooling

---

## Contact

**Koushik Ghosh**  
Email: ghoshkoushik269@gmail.com  
GitHub: [koushiknoah77](https://github.com/koushiknoah77)

---

Thank you for exploring and using the Token Info Shade Agent! 
