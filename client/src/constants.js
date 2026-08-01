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
  Other: "package",
};

// Light-paper categorical "ink wheel" — re-verified for the ledger palette
// (hand-computed WCAG contrast, ~4.1-7.1:1 against panel-bg #e8eae0 and
// surface-2 #f7f8f2; the prior dark-surface set fell to ~3:1 here and read
// washed out, so it was re-hued rather than reused as-is).
// Fixed hue-to-category mapping so color always follows category identity, never sort rank.
export const CAT_COLORS = {
  Housing: "#3d5a99",
  Food: "#2f6b4f",
  Shopping: "#9a5220",
  Utilities: "#6b7233",
  Entertainment: "#6b5ca0",
  Transport: "#a13a2e",
  Health: "#95435a",
  Subscriptions: "#8a6a1e",
  Salary: "#2f6b4f",
  Freelance: "#3d5a99",
  Investment: "#6b5ca0",
  Other: "#5c6355",
};

export const TX_CATS = Object.keys(CAT_ICONS);

export const ICON_GLYPHS = {
  food: "🍔",
  car: "🚗",
  home: "🏠",
  health: "💊",
  game: "🎮",
  book: "📚",
  cart: "🛍️",
  power: "⚡",
  salary: "💰",
  work: "💼",
  chart: "📈",
  tv: "📺",
  package: "📦",
  design: "💻",
  internet: "🌐",
  phone: "📱",
  water: "💧",
  fire: "🔥",
  fitness: "🏋️",
  shield: "🛡️",
  building: "🏢",
  receipt: "🧾",
  music: "🎵",
  tickets: "🎟️",
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
  if (!icon) return "📦";
  return ICON_GLYPHS[icon] || icon;
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
