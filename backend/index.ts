import { Hono } from "hono";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { serve } from "@hono/node-server";
import levenshtein from "js-levenshtein";

const app = new Hono();

app.use("*", cors());
app.use("*", prettyJSON());

const CACHE_TTL = 30_000;
const COIN_LIST_TTL = 24 * 3600_000;

const FIAT_CURRENCIES = new Set([
  "usd", "eur", "gbp", "inr", "jpy", "aud", "cad", "chf", "cny",
  "idr", "rub", "usdt", "usdc", "dai"
]);

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20,
};

const TOKEN_ALIASES: Record<string, string> = {
  btc: "bitcoin",
  bitcoin: "bitcoin",
  bitcoins: "bitcoin",
  eth: "ethereum",
  ethereum: "ethereum",
  sol: "solana",
  solana: "solana",
  near: "near",
  ada: "cardano",
  doge: "dogecoin",
  bnb: "binancecoin",
  dot: "polkadot",
  matic: "matic-network",
  shib: "shiba-inu",
  shiba: "shiba-inu",
  xrp: "ripple",
  avax: "avalanche-2",
  litecoin: "litecoin",
  ltc: "litecoin",
  bch: "bitcoin-cash",
  bitcoin_cash: "bitcoin-cash",
};

const STOP_WORDS = new Set([
  "of", "in", "to", "the", "a", "an", "for", "and", "on", "with",
  "at", "by", "from", "as", "is", "was", "were", "are", "how",
  "what", "which", "when", "do", "does", "did", "please", "show",
  "give", "tell", "i", "you", "we", "they", "me", "my",
  "your", "our", "their", "can", "could", "should", "would", "will",
  "be", "been", "has", "have", "had", "that", "this", "it",
  "not", "but", "or", "so", "then", "if", "else", "also", "just",
  "price", "rice", "value"
]);

type Coin = { id: string; symbol: string; name: string };
type PriceInfo = {
  id: string;
  current_price?: number | Record<string, number>;
  market_cap?: Record<string, number>;
  total_volume?: Record<string, number>;
  price_change_percentage_24h?: number;
  [key: string]: any;
};

class CoinCache {
  private bySymbol = new Map<string, Coin>();
  private byId = new Map<string, Coin>();
  private byName = new Map<string, Coin>();
  private lastUpdated = 0;

  async load() {
    if (this.lastUpdated + COIN_LIST_TTL > Date.now() && this.bySymbol.size > 500) return;
    const res = await fetch("https://api.coingecko.com/api/v3/coins/list");
    if (!res.ok) throw new Error(`Failed to fetch coin list: ${res.status}`);
    const coins: Coin[] = await res.json();
    this.bySymbol.clear();
    this.byId.clear();
    this.byName.clear();
    for (const c of coins) {
      const s = c.symbol.toLowerCase();
      const id = c.id.toLowerCase();
      const name = c.name.toLowerCase();
      if (!this.bySymbol.has(s)) this.bySymbol.set(s, c);
      if (!this.byId.has(id)) this.byId.set(id, c);
      if (!this.byName.has(name)) this.byName.set(name, c);
    }
    this.lastUpdated = Date.now();
    console.log(`Loaded ${coins.length} coins`);
  }

  find(query: string): Coin | null {
    const q = query.toLowerCase();
    if (q in TOKEN_ALIASES) return this.byId.get(TOKEN_ALIASES[q]) ?? null;
    const found = this.bySymbol.get(q) ?? this.byId.get(q) ?? this.byName.get(q) ?? null;
    if (found) return found;
    let bestDist = 3;
    let bestCoin: Coin | null = null;
    for (const symbol of this.bySymbol.keys()) {
      const dist = levenshtein(q, symbol);
      if (dist < bestDist) {
        bestDist = dist;
        bestCoin = this.bySymbol.get(symbol) ?? null;
      }
    }
    return bestCoin;
  }
}

const coinCache = new CoinCache();
const priceCache = new Map<string, { data: any; expiry: number }>();

async function cachedFetch(url: string) {
  const now = Date.now();
  const cached = priceCache.get(url);
  if (cached && cached.expiry > now) return cached.data;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

  const data = await res.json();
  priceCache.set(url, { data, expiry: now + CACHE_TTL });
  return data;
}

function formatPrice(num: number | undefined | null): string {
  if (typeof num !== "number" || !Number.isFinite(num)) return "N/A";
  if (num >= 1) return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (num === 0) return "0";
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}

function toNumber(word: string): number | null {
  return NUMBER_WORDS[word.toLowerCase()] ?? null;
}

function isValidWord(word: string): boolean {
  if (word.length < 2) return false;
  if (STOP_WORDS.has(word.toLowerCase())) return false;
  return /^[a-z0-9\-]+$/i.test(word);
}

type ConvertQuery = { type: "convert"; amount: number; from: string; to: string };
type PriceQuery = { type: "price"; tokens: Coin[]; amounts: number[]; currencies: string[]; date: string | null };
type ParsedQuery = ConvertQuery | PriceQuery;

function parseQuery(input: string): ParsedQuery {
  const lower = input.toLowerCase();

  const convertPatterns = [
    /convert\s+(\d+\.?\d*|\w+)\s+(\w+)\s+to\s+(\w+)/i,
    /^(\d+\.?\d*|\w+)\s+(\w+)\s+to\s+(\w+)/i,
    /how\s+much\s+is\s+(\d+\.?\d*|\w+)\s+(\w+)\s+in\s+(\w+)/i,
  ];

  for (const regex of convertPatterns) {
    const m = lower.match(regex);
    if (m) {
      const amount = parseFloat(m[1]) || toNumber(m[1]) || 1;
      return { type: "convert", amount, from: m[2], to: m[3] };
    }
  }

  const dateMatch = lower.match(/(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch ? dateMatch[1] : null;

  const inputWithoutDate = date ? lower.replace(date, " ") : lower;

  const words = (inputWithoutDate.match(/\b[a-z0-9\-]+\b/g) ?? []).filter(isValidWord);

  const tokens: Coin[] = [];
  const fiats: string[] = [];

  for (const word of words) {
    if (FIAT_CURRENCIES.has(word)) fiats.push(word);
    else {
      const coin = coinCache.find(word);
      if (coin && !tokens.find((c) => c.id === coin.id)) tokens.push(coin);
    }
  }

  if (tokens.length === 0) {
    const btc = coinCache.find("btc");
    if (btc) tokens.push(btc);
  }
  if (fiats.length === 0) fiats.push("usd");

  let amounts = (inputWithoutDate.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  if (amounts.length === 0) {
    for (const word of words) {
      const num = toNumber(word);
      if (num !== null) amounts.push(num);
    }
  }
  if (amounts.length === 0) amounts = tokens.map(() => 1);
  else if (amounts.length === 1 && tokens.length > 1) amounts = tokens.map(() => amounts[0]);
  else if (amounts.length < tokens.length) while (amounts.length < tokens.length) amounts.push(amounts[0]);
  else if (amounts.length > tokens.length) amounts = amounts.slice(0, tokens.length);

  const overrideCurrency = (() => {
    const m = lower.match(/to\s+(\w+)/);
    if (m && m[1]) {
      if (FIAT_CURRENCIES.has(m[1]) || coinCache.find(m[1])) return m[1];
    }
    return null;
  })();

  const currencies = overrideCurrency ? [overrideCurrency] : fiats;
  return { type: "price", tokens, amounts, currencies, date };
}

async function fetchPrices(tokens: Coin[], currencies: string[]): Promise<PriceInfo[]> {
  if (!tokens.length || !currencies.length) return [];
  const ids = tokens.map((t) => t.id).join(",");
  const vs_currency = currencies[0].toLowerCase();
  const vs = currencies.join(",").toLowerCase();
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vs_currency}&ids=${ids}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`;

  try {
    return (await cachedFetch(url)) as PriceInfo[];
  } catch {
    const simplePriceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vs}&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;
    const data = (await cachedFetch(simplePriceUrl)) as Record<string, any>;
    return Object.entries(data).map(([id, val]): PriceInfo => ({
      id,
      current_price: val[vs_currency],
      market_cap: val.market_cap,
      total_volume: val.total_volume,
      price_change_percentage_24h: val.price_change_percentage_24h,
    }));
  }
}

async function fetchHistoricalPrice(tokenId: string, date: string) {
  const [year, month, day] = date.split("-");
  const formatted = `${day}-${month}-${year}`;
  const url = `https://api.coingecko.com/api/v3/coins/${tokenId}/history?date=${formatted}`;
  try {
    return await cachedFetch(url);
  } catch {
    return null;
  }
}

function renderLine(
  amount: number,
  coin: Coin,
  price: number,
  currency: string,
  date: string | null,
  extra: string
) {
  const sym = coin.symbol.toUpperCase();
  const cur = currency.toUpperCase();
  const datePart = date ? ` (${date})` : "";
  return amount === 1
    ? `${sym} price: ${formatPrice(price)} ${cur}${datePart}${extra ? " " + extra : ""}`
    : `${amount} ${sym} = ${formatPrice(price * amount)} ${cur}${datePart}${extra ? " " + extra : ""}`;
}

function renderMarkdown(lines: string[]) {
  let md =
    "| Token | Amount | Currency | Total Price |\n" +
    "|-------|--------|----------|-------------|\n";
  for (const line of lines) {
    const m = line.match(/^(\d+(\.\d+)?)\s+(\w+)\s+=\s+([\d\.,]+)\s+(\w+)/);
    if (m) {
      md += `| ${m[3]} | ${m[1]} | ${m[5]} | ${m[4]} |\n`;
    } else {
      md += `| ${line} | | | |\n`;
    }
  }
  return md;
}

async function generateAnswer(query: string, asMarkdown: boolean): Promise<string> {
  const parsed = parseQuery(query);

  if (parsed.type === "convert") {
    const { amount, from, to } = parsed;
    if (!from || !to) return "Invalid conversion query.";

    const coinFrom = coinCache.find(from);
    const coinTo = coinCache.find(to);
    if (!coinFrom) return `Unknown token: ${from}`;
    if (!coinTo) return `Unknown token: ${to}`;

    try {
      const prices = await fetchPrices([coinFrom, coinTo], ["usd"]);
      const priceFrom = prices.find((p: PriceInfo) => p.id === coinFrom.id);
      const priceTo = prices.find((p: PriceInfo) => p.id === coinTo.id);

      const priceFromUsd =
        typeof priceFrom?.current_price === "object"
          ? priceFrom?.current_price?.["usd"]
          : priceFrom?.current_price;
      const priceToUsd =
        typeof priceTo?.current_price === "object"
          ? priceTo?.current_price?.["usd"]
          : priceTo?.current_price;

      if (!priceFromUsd || !priceToUsd) return "Conversion price unavailable.";

      const convertedValue = (priceFromUsd / priceToUsd) * amount;

      const line = `${amount} ${coinFrom.symbol.toUpperCase()} = ${formatPrice(convertedValue)} ${coinTo.symbol.toUpperCase()}`;

      return asMarkdown
        ? `| From | Amount | To | Converted |\n|------|--------|----|-----------|\n| ${coinFrom.symbol.toUpperCase()} | ${amount} | ${coinTo.symbol.toUpperCase()} | ${formatPrice(convertedValue)} |`
        : line;
    } catch (e) {
      console.error("Error fetching conversion prices:", e);
      return "Error fetching conversion price data.";
    }
  }

  const { tokens, amounts, currencies, date } = parsed;

  if (tokens.length === 0) return "No tokens recognized in your query.";

  if (date) {
    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (requestedDate > today)
      return `Cannot retrieve price for future date (${date}).`;

    let lines: string[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const amount = amounts[i];
      const historicalData = await fetchHistoricalPrice(token.id, date);
      if (
        !historicalData ||
        !historicalData.market_data ||
        !historicalData.market_data.current_price
      ) {
        lines.push(`No historical data for ${token.symbol.toUpperCase()} on ${date}.`);
        continue;
      }
      for (const currency of currencies) {
        const price = historicalData.market_data.current_price[currency];
        if (typeof price !== "number" || !price || price <= 0) {
          lines.push(
            `No historical price for ${token.symbol.toUpperCase()} in ${currency.toUpperCase()} on ${date}.`
          );
          continue;
        }
        const cap = historicalData.market_data.market_cap?.[currency];
        const vol = historicalData.market_data.total_volume?.[currency];
        const change = historicalData.market_data.price_change_percentage_24h ?? null;

        lines.push(
          renderLine(
            amount,
            token,
            price,
            currency,
            date,
            `[MCap: ${cap ? cap.toLocaleString() : "N/A"}, Vol: ${
              vol ? vol.toLocaleString() : "N/A"
            }, 24hΔ: ${change !== null ? change.toFixed(2) + "%" : "N/A"}]`
          )
        );
      }
    }
    return lines.length > 0 ? (asMarkdown ? renderMarkdown(lines) : lines.join("\n")) : `No historical data for ${date}.`;
  }

  let lines: string[] = [];
  try {
    const prices = await fetchPrices(tokens, currencies);
    for (const [i, token] of tokens.entries()) {
      for (const currency of currencies) {
        const priceInfo = prices.find((p: PriceInfo) => p.id === token.id);
        if (!priceInfo) continue;
        const price =
          typeof priceInfo.current_price === "object"
            ? priceInfo.current_price[currency]
            : priceInfo.current_price;
        if (typeof price !== "number" || !price || price <= 0) continue;
        const amount = amounts[i];
        const cap = priceInfo.market_cap?.[currency];
        const vol = priceInfo.total_volume?.[currency];
        const change = priceInfo.price_change_percentage_24h;
        lines.push(
          renderLine(
            amount,
            token,
            price,
            currency,
            null,
            `[MCap: ${cap ? cap.toLocaleString() : "N/A"}, Vol: ${
              vol ? vol.toLocaleString() : "N/A"
            }, 24hΔ: ${change ? change.toFixed(2) + "%" : "N/A"}]`
          )
        );
      }
    }
  } catch (e) {
    console.error("Error fetching prices:", e);
    return "Error fetching price data.";
  }
  if (lines.length === 0) return "No price data found for your query.";
  return asMarkdown ? renderMarkdown(lines) : lines.join("\n");
}

app.post("/prompt", async (c) => {
  const json = (await c.req.json().catch(() => ({}))) as { prompt?: string };
  const prompt = json.prompt?.trim() ?? "";
  if (!prompt) return c.text("Please provide prompt.", 400);
  try {
    const accept = c.req.header("accept") ?? "";
    const isMarkdown = accept.includes("markdown");
    const isJson = accept.includes("json");
    const result = await generateAnswer(prompt, isMarkdown);
    if (isJson) return c.json({ prompt, result });
    return c.text(result);
  } catch (e) {
    console.error(e);
    return c.text("Internal server error.", 500);
  }
});

app.get("/prompt", async (c) => {
  const prompt = (c.req.query("q") as string) ?? "";
  if (!prompt.trim()) return c.text("Query missing.", 400);
  try {
    const accept = c.req.header("accept") ?? "";
    const isMarkdown = accept.includes("markdown");
    const isJson = accept.includes("json");
    const result = await generateAnswer(prompt, isMarkdown);
    if (isJson) return c.json({ prompt, result });
    return c.text(result);
  } catch (e) {
    console.error(e);
    return c.text("Internal server error.", 500);
  }
});

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/", (c) => c.text("Token Info Agent Backend is running"));

const PORT = Number(process.env.PORT) || 3000;

(async () => {
  await coinCache.load();
  console.log(`Token Info Agent Backend running on port ${PORT}`);
  serve({ fetch: app.fetch, port: PORT });
})();
