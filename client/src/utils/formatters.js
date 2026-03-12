const BASE_CURRENCY = "AUD";
const DISPLAY_CURRENCIES = {
  AUD: { locale: "en-AU", rateFromAud: 1 },
  USD: { locale: "en-US", rateFromAud: 1 / 1.4 },
};
const DISPLAY_CURRENCY_STORAGE_KEY = "financehub_display_currency";

let currentDisplayCurrency = readStoredCurrency();

function readStoredCurrency() {
  if (typeof window === "undefined") {
    return BASE_CURRENCY;
  }

  const stored = window.localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY);
  return DISPLAY_CURRENCIES[stored] ? stored : BASE_CURRENCY;
}

function getCurrencyConfig(currencyCode = currentDisplayCurrency) {
  return DISPLAY_CURRENCIES[currencyCode] || DISPLAY_CURRENCIES[BASE_CURRENCY];
}

function convertFromAud(amount, currencyCode = currentDisplayCurrency) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 0;
  return value * getCurrencyConfig(currencyCode).rateFromAud;
}

function formatCurrencyValue(amount, currencyCode = currentDisplayCurrency) {
  const value = convertFromAud(amount, currencyCode);
  return formatRawCurrencyValue(value, currencyCode);
}

function formatRawCurrencyValue(amount, currencyCode) {
  const config = getCurrencyConfig(currencyCode);
  const numeric = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
  return `${currencyCode}$${numeric}`;
}

function formatRawCompactCurrencyValue(amount, currencyCode) {
  const config = getCurrencyConfig(currencyCode);
  const numeric = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
  return `${currencyCode}$${numeric}`;
}

export function getDisplayCurrency() {
  return currentDisplayCurrency;
}

export function setDisplayCurrency(currencyCode) {
  currentDisplayCurrency = DISPLAY_CURRENCIES[currencyCode] ? currencyCode : BASE_CURRENCY;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, currentDisplayCurrency);
  }
}

export function getDisplayCurrencyOptions() {
  return Object.keys(DISPLAY_CURRENCIES);
}

export function convertUsdToAud(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 0;
  return value * 1.4;
}

export const fmt = (n) =>
  formatCurrencyValue(n);

export const fmtCurrency = (n) =>
  formatCurrencyValue(n);

export const fmtSignedCurrency = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return "-";
  return `${value >= 0 ? "+" : "-"}${fmtCurrency(Math.abs(value))}`;
};

export const fmtUsdFromAud = (n) => formatCurrencyValue(n, "USD");

export const fmtRawUsd = (n) => formatRawCurrencyValue(n, "USD");

export const fmtCompactCurrency = (n) => {
  const value = convertFromAud(n);
  const currencyCode = getDisplayCurrency();
  const compactValue = value >= 1000 ? `${Math.round(value / 1000)}k` : Math.round(value);
  return `${currencyCode}$${compactValue}`;
};

export const fmtPercent = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(2)}%`;
};

export const fmtSignedPercent = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return "-";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};

export const fmtQuantity = (n) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(n ?? 0);

export const fmtDate = (d) => {
  if (!d) return "-";
  return new Date(`${d}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
