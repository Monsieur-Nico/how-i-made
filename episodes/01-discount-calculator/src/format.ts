export function formatPercent(n: number): string {
  return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
}

export function formatMoney(cents: number, currency: string, locale?: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}

/** The symbol a currency uses in this locale, e.g. "$" or "€". */
export function currencySymbol(currency: string, locale?: string): string {
  const parts = new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? currency;
}
