const DASH = "–";

const intFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const eur0 = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct1 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatNumber(v: number | null | undefined) {
  return v == null || !Number.isFinite(v) ? DASH : intFmt.format(v);
}

/** EUR with no decimals for large totals, two decimals for unit costs (CPL). */
export function formatEUR(v: number | null | undefined, decimals: 0 | 2 = 0) {
  if (v == null || !Number.isFinite(v)) return DASH;
  return (decimals === 2 ? eur2 : eur0).format(v);
}

/** v is already a percentage (e.g. 2.37 → "2.4%"). */
export function formatPercent(v: number | null | undefined) {
  return v == null || !Number.isFinite(v) ? DASH : `${pct1.format(v)}%`;
}

/** Rounds to one decimal first so tiny changes show as "0.0", not "-0.0". */
function formatSigned(v: number, suffix: string) {
  const r = Math.round(v * 10) / 10 || 0;
  return `${r > 0 ? "+" : ""}${pct1.format(r)}${suffix}`;
}

export function formatSignedPercent(v: number) {
  return formatSigned(v, "%");
}

export function formatSignedPoints(v: number) {
  return formatSigned(v, " pp");
}

/** CPL is shown as "–" when there is no cost. */
export function formatCPL(v: number | null | undefined) {
  return formatEUR(v, 2);
}

export function percentChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
