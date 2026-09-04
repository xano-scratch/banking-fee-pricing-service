// Display helpers. The backend returns decimals as numbers and timestamps as
// epoch ms; some inferred types resolve to `unknown` (nested obj members), so
// these coerce defensively and never throw on a missing value.

const toNum = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export function money(v: unknown, currency: unknown = "USD"): string {
  const n = toNum(v);
  if (n === null) return "—";
  const cur = typeof currency === "string" && currency ? currency : "USD";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n);
}

export function signedMoney(v: unknown, currency: unknown = "USD"): string {
  const n = toNum(v);
  if (n === null) return "—";
  if (n === 0) return money(0, currency);
  const cur = typeof currency === "string" && currency ? currency : "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: cur,
    signDisplay: "always",
  }).format(n);
}

export function band(min: unknown, max: unknown, currency: unknown = "USD"): string {
  const lo = money(min, currency);
  if (max === null || max === undefined) return `${lo} and up`;
  return `${lo} to ${money(max, currency)}`;
}

export function dateTime(ms: unknown): string {
  const n = toNum(ms);
  if (n === null) return "—";
  return new Date(n).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function text(v: unknown): string {
  return v === null || v === undefined ? "—" : String(v);
}
