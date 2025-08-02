import { useEffect, useState, useRef } from "react";
import "./App.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/prompt";

type Token = { id: string; symbol: string; name: string; image?: string };

type HistoryEntry = { query: string; timestamp: number };

export default function App() {
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState(() => localStorage.getItem("app-format") || "text/plain");
  const [theme, setTheme] = useState(() => localStorage.getItem("app-theme") || "light");

  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const stored = localStorage.getItem("query-history");
      if (stored) return JSON.parse(stored);
      return [];
    } catch {
      return [];
    }
  });

  const [tokens, setTokens] = useState<Token[]>([]);

  const [showTokenSuggestions, setShowTokenSuggestions] = useState(false);
  const [autocompleteFilteredTokens, setAutocompleteFilteredTokens] = useState<Token[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLPreElement>(null);

  // Keyboard shortcuts: Enter submits, Ctrl+Enter copies result
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && result) {
        e.preventDefault();
        copyToClipboard();
      } else if (e.key === "Enter" && document.activeElement === inputRef.current && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [result, query, format]);

  // Load tokens from CoinGecko and fetch logos for popular coins
  useEffect(() => {
    async function fetchTokens() {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/coins/list");
        if (!res.ok) throw new Error("Failed to fetch token list");
        const json: Token[] = await res.json();

        const popularIds = ["bitcoin", "ethereum", "solana", "cardano", "dogecoin", "binancecoin", "polkadot"];
        const ids = popularIds.join(",");
        let images: Record<string, string> = {};
        try {
          const imgRes = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`);
          if (imgRes.ok) {
            const imgJson = await imgRes.json();
            images = imgJson.reduce((acc: Record<string,string>, c: any) => {
              acc[c.id] = c.image;
              return acc;
            }, {});
          }
        } catch {}

        const fullTokens = json.map((t) => ({
          ...t,
          image: images[t.id],
        }));
        setTokens(fullTokens);
      } catch (e) {
        console.error("Could not load tokens", e);
      }
    }
    fetchTokens();
  }, []);

  // Store history in localStorage
  useEffect(() => {
    localStorage.setItem("query-history", JSON.stringify(history));
  }, [history]);

  // Store theme and apply to document root
  useEffect(() => {
    localStorage.setItem("app-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Store format
  useEffect(() => {
    localStorage.setItem("app-format", format);
  }, [format]);

  // Scroll result into view after update
  useEffect(() => {
    resultRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [result]);

  // Hide toast after 2 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Filter token suggestions based on last word typed
  useEffect(() => {
    const lastWord = query.trim().split(/\s+/).pop() || "";
    if (lastWord.length >= 2) {
      const filtered = tokens
        .filter((t) =>
          t.symbol.toLowerCase().startsWith(lastWord.toLowerCase()) ||
          t.name.toLowerCase().startsWith(lastWord.toLowerCase())
        )
        .slice(0, 5);
      setAutocompleteFilteredTokens(filtered);
      setShowTokenSuggestions(filtered.length > 0);
    } else {
      setShowTokenSuggestions(false);
    }
  }, [query, tokens]);

  async function handleSubmit(e?: React.FormEvent | Event) {
    if (e && "preventDefault" in e) e.preventDefault();
    if (!query.trim()) {
      setError("Query cannot be empty.");
      setResult("");
      return;
    }
    setError(null);
    setLoading(true);
    setResult("");
    setShowTokenSuggestions(false);
    try {
      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: format },
        body: JSON.stringify({ prompt: query.trim() }),
      });
      if (!res.ok) {
        setError(`Server error: ${res.status} ${res.statusText}`);
        setResult("");
      } else if (format === "application/json") {
        const data = await res.json();
        setResult(JSON.stringify(data, null, 2));
        setError(null);
      } else {
        const text = await res.text();
        setResult(text);
        setError(null);
      }
      setHistory((h) => {
        if (h.length > 0 && h[0].query === query.trim()) return h;
        return [{ query: query.trim(), timestamp: Date.now() }, ...h].slice(0, 50);
      });
    } catch (err: any) {
      setError(`Fetch error: ${err.message || "Unknown error"}`);
      setResult("");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setToast("Copied to clipboard!");
    });
  }

  function downloadFile(type: "csv" | "json") {
    if (!result) return;
    let dataStr = result;
    let fileName = "token-info-result";

    if (type === "json") {
      try {
        const jsonObj = JSON.parse(result);
        dataStr = JSON.stringify(jsonObj, null, 2);
      } catch {}
      fileName += ".json";
    } else if (type === "csv") {
      if (result.startsWith("|")) {
        dataStr = result
          .split("\n")
          .filter((line) => line.startsWith("|"))
          .map((line) =>
            line
              .slice(1, -1)
              .split("|")
              .map((cell) => cell.trim().replace(/"/g, '""'))
              .map((cell) => `"${cell}"`)
              .join(",")
          )
          .join("\n");
      } else {
        dataStr = `"Result"\n"${result.replace(/"/g, '""')}"`;
      }
      fileName += ".csv";
    }

    const blob = new Blob([dataStr], { type: `text/${type}` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  function selectHistoryEntry(entry: HistoryEntry) {
    setQuery(entry.query);
    setError(null);
    setResult("");
    inputRef.current?.focus();
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem("query-history");
    setToast("History cleared");
  }

  function toggleTheme() {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }

  function insertTokenSymbol(symbol: string) {
    if (!inputRef.current) return;
    const input = inputRef.current;
    const start = input.selectionStart ?? query.length;
    const end = input.selectionEnd ?? query.length;

    const newQuery =
      query.substring(0, start) +
      symbol +
      " " +
      query.substring(end);

    setQuery(newQuery);
    setShowTokenSuggestions(false);

    setTimeout(() => {
      const pos = start + symbol.length + 1;
      input.setSelectionRange(pos, pos);
      input.focus();
    }, 0);
  }

  return (
    <div className="glass-bg" data-theme={theme}>
      <div className="glass-center">
        <div className="glass-card" role="main" aria-live="polite" aria-label="Token Info Shade Agent Application">
          <div className="app-header">
            <div className="glass-logo" aria-hidden="true" title="Token Info Shade Agent Logo">
              <span role="img" aria-label="Token">💠</span>
            </div>
            <h1 className="glass-title">
              Token Info <span className="highlight">Shade Agent</span>
            </h1>
            <button onClick={toggleTheme} aria-label="Toggle dark/light theme" className="theme-toggle-btn" type="button" title="Toggle light/dark theme">
              {theme === "light" ? "🌙 Dark" : "☀️ Light"}
            </button>
          </div>

          <p className="glass-desc" id="description-text">
            Ask about token prices, like “1 sol in inr” or “convert 3 eth to btc”
          </p>

          <form className="glass-form" onSubmit={handleSubmit} aria-describedby="description-text">
            <div className="input-wrapper" style={{ position: "relative", flexGrow: 2 }}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {setQuery(e.target.value); setError(null);}}
                placeholder="e.g. 5 sol in inr"
                disabled={loading}
                aria-autocomplete="list"
                aria-controls="token-autocomplete-list"
                aria-expanded={showTokenSuggestions}
                aria-haspopup="listbox"
                aria-label="Enter your token price query"
                autoComplete="off"
                spellCheck={false}
              />
              {showTokenSuggestions && autocompleteFilteredTokens.length > 0 && (
                <ul
                  tabIndex={-1}
                  role="listbox"
                  id="token-autocomplete-list"
                  className="autocomplete-list"
                  aria-label="Token suggestions"
                >
                  {autocompleteFilteredTokens.map((tok) => (
                    <li
                      key={tok.id}
                      role="option"
                      tabIndex={0}
                      aria-selected={false}
                      onClick={() => insertTokenSymbol(tok.symbol)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          insertTokenSymbol(tok.symbol);
                        }
                      }}
                      className="autocomplete-item"
                    >
                      {tok.image ? <img src={tok.image} alt={tok.symbol} className="token-icon"/> : <span className="token-placeholder"/>}
                      <span>{tok.symbol.toUpperCase()}</span> — <span className="token-name">{tok.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              disabled={loading}
              aria-label="Select response format"
            >
              <option value="text/plain">Plain Text</option>
              <option value="application/json">JSON</option>
              <option value="text/markdown">Markdown Table</option>
            </select>

            <button type="submit" disabled={loading} aria-busy={loading}>
              {loading ? "Loading..." : "Ask"}
            </button>
          </form>

          <div className="history-container" aria-label="Query history">
            <summary>
              <strong>History</strong>
              {history.length > 0 && <button onClick={clearHistory} title="Clear history" className="clear-history-btn" aria-label="Clear query history">✕</button>}
            </summary>
            <ul className="history-list">
              {history.slice(0, 5).map((entry) => (
                <li key={entry.timestamp}>
                  <button
                    type="button"
                    className="history-item-btn"
                    onClick={() => selectHistoryEntry(entry)}
                    title={`Query from ${new Date(entry.timestamp).toLocaleString()}`}
                  >
                    {entry.query}
                  </button>
                </li>
              ))}
              {history.length === 0 && <li className="empty-history">No history yet</li>}
            </ul>
          </div>

          {error && <div className="error-msg" role="alert" aria-live="assertive">{error}</div>}

          {loading && <div className="spinner" aria-label="Loading indicator" role="status"></div>}

          {(!loading && result) && (
            <>
              <pre ref={resultRef} className="glass-result" tabIndex={0} aria-live="polite" aria-atomic="true" role="region">
                {result}
              </pre>
              <div className="results-actions">
                <button
                  type="button"
                  className="copy-btn"
                  onClick={copyToClipboard}
                  aria-label="Copy result to clipboard"
                  title="Copy result to clipboard"
                >
                  📋 Copy
                </button>
                <button
                  type="button"
                  className="download-btn"
                  onClick={() => downloadFile("json")}
                  aria-label="Download result as JSON"
                  title="Download result as JSON file"
                >
                  📥 JSON
                </button>
                <button
                  type="button"
                  className="download-btn"
                  onClick={() => downloadFile("csv")}
                  aria-label="Download result as CSV"
                  title="Download result as CSV file"
                >
                  📥 CSV
                </button>
              </div>
            </>
          )}

          {(!loading && !result && !error) && (
            <pre className="glass-result" tabIndex={0} aria-live="polite" aria-atomic="true" role="region" aria-label="Results will appear here">
              Results will appear here
            </pre>
          )}

          {toast && (
            <div className="toast" role="alert" aria-live="assertive">
              {toast}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
