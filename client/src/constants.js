export const CAT_ICONS = {
  Food: "food",
  Transport: "car",
  Housing: "home",
  Health: "health",
  Entertainment: "game",
  Education: "book",
  Shopping: "cart",
  Utilities: "power",
  Salary: "salary",
  Freelance: "work",
  Investment: "chart",
  Subscriptions: "tv",
  Debt: "exchange",
  Other: "package",
};

// Categorical "data ink" for the expense donut and category chips — tuned
// for legibility on the Night Board dark surfaces (#14171d cards, #0d0f13
// page). Income-side categories (Salary, Freelance, Investment) reuse an
// expense hue since the two sets never render in the same chart together.
export const CAT_COLORS = {
  Housing: "#6a8dff",
  Food: "#e0a530",
  Shopping: "#e0615a",
  Utilities: "#9b8fd4",
  Entertainment: "#e0709e",
  Transport: "#4fc4c9",
  Health: "#5bc9e0",
  Subscriptions: "#c9a24c",
  Debt: "#3fb37f",
  Salary: "#3fb37f",
  Freelance: "#6a8dff",
  Investment: "#e0709e",
  Other: "#7d8290",
};

export const TX_CATS = Object.keys(CAT_ICONS);

// Crypto tickers stay as text badges, not icons — a monospace symbol in a
// bordered box reads as a real exchange ticker and needs no glyph.
export const TICKER_GLYPHS = {
  btc: "₿",
  eth: "Ξ",
  bnb: "BNB",
  sol: "SOL",
  ada: "ADA",
  xrp: "XRP",
  doge: "DOGE",
  avax: "AVAX",
  link: "LINK",
};

export function resolveIconGlyph(icon) {
  if (!icon) return "?";
  return TICKER_GLYPHS[icon] || icon.slice(0, 4).toUpperCase();
}

export const SUB_CATS = [
  "Streaming",
  "Software",
  "Internet",
  "Phone",
  "Energy",
  "Water",
  "Gas",
  "Housing",
  "Gym",
  "Insurance",
  "Education",
  "Council",
  "Taxes",
  "Other",
];

export const SUB_CAT_ICONS = {
  Streaming: "tv",
  Software: "design",
  Internet: "internet",
  Phone: "phone",
  Energy: "power",
  Water: "water",
  Gas: "fire",
  Housing: "home",
  Gym: "fitness",
  Insurance: "shield",
  Education: "book",
  Council: "building",
  Taxes: "receipt",
  Other: "package",
};

export const INVESTMENT_CATALOG = [
  { symbol: "BTC", name: "Bitcoin", marketType: "crypto", providerId: "bitcoin", icon: "btc" },
  { symbol: "ETH", name: "Ether", marketType: "crypto", providerId: "ethereum", icon: "eth" },
  { symbol: "BNB", name: "Binance Coin", marketType: "crypto", providerId: "binancecoin", icon: "bnb" },
  { symbol: "SOL", name: "Solana", marketType: "crypto", providerId: "solana", icon: "sol" },
  { symbol: "ADA", name: "Cardano", marketType: "crypto", providerId: "cardano", icon: "ada" },
  { symbol: "XRP", name: "XRP", marketType: "crypto", providerId: "ripple", icon: "xrp" },
  { symbol: "DOGE", name: "Dogecoin", marketType: "crypto", providerId: "dogecoin", icon: "doge" },
  { symbol: "AVAX", name: "Avalanche", marketType: "crypto", providerId: "avalanche-2", icon: "avax" },
  { symbol: "LINK", name: "Chainlink", marketType: "crypto", providerId: "chainlink", icon: "link" },
];

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const TREND_RANGES = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"];
