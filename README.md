# Token Info Shade Agent

> An autonomous crypto token price agent that answers natural language queries about cryptocurrency prices, conversions, and historical data — powered by the CoinGecko API.  
> Built with a modern React frontend and a Node.js backend, featuring responsive design, token autocomplete, dark mode toggle, query history, and multi-format output.

---

## Table of Contents

- [Demo](#demo)
- [Features](#features)
- [Getting Started](#getting-started)  
  - [Prerequisites](#prerequisites)  
  - [Installation](#installation)  
  - [Running the Agent](#running-the-agent)
- [Usage](#usage)  
  - [Web App](#web-app)  
  - [API Endpoint](#api-endpoint)
- [Example Queries](#example-queries)
- [Technical Details](#technical-details)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)
- [Contact](#contact)

---

## Demo

A demo video walkthrough illustrating the core features and usage of the Token Info Shade Agent is included:

- [demo.mp4](./demo.mp4)

Try running it locally by following the instructions below.

---

## Features

- Natural language prompt parsing for token prices, conversions, and historical data  
- Supports token and fiat detection with autocomplete and aliases  
- Real-time data and historical prices (dates support) via CoinGecko API  
- Multi-token queries and multi-currency support  
- Output formats: Plain Text, JSON, Markdown Table  
- Responsive, accessible React UI with dark/light theme toggle  
- Query history tracking with quick reuse and clearing  
- Copy to clipboard and downloading results as JSON or CSV  
- Keyboard shortcuts for submitting queries and copying results  
- Autonomous operations with caching and no manual refresh needed  

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher (includes npm)  
- Internet connection for live API calls

### Installation

Clone the repository:

git clone https://github.com/koushiknoah77/token-info-agent.git
cd token-info-agent

text

### Backend Setup

cd backend
npm install
npm run start



The backend server listens on: [http://localhost:3000](http://localhost:3000) by default.

### Frontend Setup

Open a new terminal window/tab and run:

cd ../frontend
npm install
npm run dev

text

The frontend will be available at: [http://localhost:5173](http://localhost:5173)

> **Note:**  
> If your backend runs on a non-default URL or port, create a `.env` file inside the `frontend/` directory with the following content:  
> `VITE_BACKEND_URL="http://your-backend-url:port/prompt"`

---

## Running the Agent

Once backend and frontend servers are running:

- Open the frontend URL (`http://localhost:5173`) in your browser.
- Enter natural language queries about token prices or conversions.
- Select the desired output format.
- View, copy, or download the results.
- Use the query history panel for quick access to past queries.
- Switch themes using the dark/light toggle.

---

## Usage

### Web App

- Input a query like:  
  - `"What’s the price of SOL?"`  
  - `"5 eth to usd"`  
  - `"convert 10 doge to btc"`  
  - `"price of bitcoin on 2023-06-01"`

- Select output format: Plain Text, JSON, or Markdown Table.
- Click **Ask** or press **Enter** to submit.
- Copy output by clicking the 📋 button.
- Download results as JSON or CSV with the download buttons.
- Dark mode toggle available on top right.
- Use keyboard shortcuts:  
  - `Enter` submits query  
  - `Ctrl+Enter` copies current result

### API Endpoint

Send POST requests to the backend `/prompt` endpoint with JSON body:

{ "prompt": "your natural language query" }



**Example with curl:**

curl -X POST http://localhost:3000/prompt
-H "Content-Type: application/json"
-H "Accept: text/plain"
-d '{"prompt":"what is the price of sol?"}'



Supported `Accept` headers:  
- `text/plain` (default)  
- `application/json`  
- `text/markdown`

---

## Example Queries

| Query                           | Description                                   | Output Format          |
|--------------------------------|-----------------------------------------------|------------------------|
| `price of sol`                 | Current Solana token price                    | Plain Text, JSON, Markdown |
| `3 eth in usd`                 | Conversion of 3 ETH to USD                    | All formats            |
| `convert 10 doge to btc`       | Dogecoin to Bitcoin conversion                | All formats            |
| `price of bitcoin on 2023-06-01`| Bitcoin price on a past date                 | Plain Text, JSON       |

More example queries with expected output are available in [`prompt_examples.txt`](./prompt_examples.txt).

---

## Technical Details

- **Backend:** Node.js with [Hono](https://hono.dev/) - lightweight server framework. Handles prompt parsing, queries CoinGecko API, caches results for performance.  
- **Frontend:** React with TypeScript compiled to JavaScript, providing responsive, accessible UI with dark mode and token autocomplete.  
- **Prompt Parsing:** Extracts token symbols, fiat currencies, amounts, and optional historical dates using regex and fuzzy matching.  
- **Caching:** Coin and price data cached to minimize API calls and improve responsiveness.  
- **Output:** Supports multiple formats and detailed info including market cap, volume, and 24h price change.

---

## Project Structure

/token-info-agent/
├── backend/ # Backend API server (Node.js with Hono)
├── frontend/ # React frontend app (TypeScript/JavaScript)
├── prompt_examples.txt # Sample queries with expected results
├── demo.mp4 # Video demo walkthrough
├── README.md # This README file
└── LICENSE # MIT License



---

## Troubleshooting

- **No results or server errors:**  
  - Ensure backend is running and reachable.  
  - Check network connectivity for CoinGecko API.  
- **Token not recognized:**  
  - Try common aliases (e.g., `btc` instead of `bitcoin`).  
  - Make sure tokens are spelled correctly.  
- **Dark mode text not visible or UI glitches:**  
  - Confirm latest stylesheets are loaded.  
  - Try hard-refresh your browser.  
- **Port conflicts on backend or frontend:**  
  - Change ports by setting environment variables (e.g., `PORT` for backend).  
- **Frontend not connecting to backend:**  
  - Verify `VITE_BACKEND_URL` matches backend’s API URL in frontend `.env`.

---

## Contributing

Contributions, bug reports, feature requests, and improvements are welcome! Please:

1. Fork the repository.  
2. Create a feature branch.  
3. Commit your changes with clear messages.  
4. Submit a pull request.

---

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

---

## Acknowledgments

- [CoinGecko API](https://www.coingecko.com/en/api) for providing reliable token data  
- [NEAR Shade Agents](https://docs.near.org/ai/shade-agents/introduction) for inspiration and guidance  
- Open source projects and communities who contributed tooling and ideas

---

## Contact

If you have questions, feedback, or want to collaborate, please open an issue or contact:

**Koushi Ghosh**  
**Email:** ghoshkoushik269@gmail.com 
**GitHub:** https://github.com/koushiknoah77

---

Thank you for exploring and using the Token Info Shade Agent! 
# token-info-agent
