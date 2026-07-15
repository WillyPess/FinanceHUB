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

// Dark-surface categorical palette — CVD-checked (validate_palette.js, --mode dark).
// Fixed hue-to-category mapping so color always follows category identity, never sort rank.
export const CAT_COLORS = {
  Housing: "#3987e5",
  Food: "#199e70",
  Shopping: "#c98500",
  Utilities: "#008300",
  Entertainment: "#9085e9",
  Transport: "#e66767",
  Health: "#d55181",
  Subscriptions: "#d95926",
  Salary: "#199e70",
  Freelance: "#3987e5",
  Investment: "#9085e9",
  Other: "#7d83b8",
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
