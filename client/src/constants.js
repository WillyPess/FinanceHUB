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

export const CAT_COLORS = {
  Housing: "#22c55e",
  Food: "#3b82f6",
  Shopping: "#f59e0b",
  Entertainment: "#a855f7",
  Transport: "#ef4444",
  Utilities: "#10b981",
  Health: "#06b6d4",
  Subscriptions: "#f97316",
  Salary: "#22c55e",
  Freelance: "#3b82f6",
  Investment: "#6366f1",
  Other: "#94a3b8",
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

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
