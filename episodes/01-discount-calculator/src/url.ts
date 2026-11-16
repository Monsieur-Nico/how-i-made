import type { Discount } from "./calc";

export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type Stack = { priceCents: number; currency: Currency; discounts: Discount[] };

export const DEFAULT_STACK: Stack = {
  priceCents: 10000,
  currency: "USD",
  discounts: [
    { kind: "percent", value: 40 },
    { kind: "percent", value: 20 },
  ],
};

const toCents = (units: number) => Math.round(units * 100);
const toUnits = (cents: number) => String(cents / 100);

function readDiscount(token: string): Discount | null {
  const match = /^(\d+(?:\.\d+)?)([pa])$/.exec(token.trim());
  if (!match) return null;
  const n = Number(match[1]);
  if (match[2] === "p") return n > 0 && n <= 100 ? { kind: "percent", value: n } : null;
  return n > 0 ? { kind: "amount", cents: toCents(n) } : null;
}

/** Reads a stack from a query string; a broken price gives the default stack, a broken discount is dropped. */
export function readStack(query: string): Stack {
  const params = new URLSearchParams(query);
  const price = Number(params.get("price"));
  if (!params.has("price") || !Number.isFinite(price) || price <= 0) return DEFAULT_STACK;

  const cur = params.get("cur");
  const currency = CURRENCIES.find((c) => c === cur) ?? "USD";
  const discounts = (params.get("d") ?? "")
    .split(",")
    .filter(Boolean)
    .map(readDiscount)
    .filter((d): d is Discount => d !== null);

  return { priceCents: toCents(price), currency, discounts };
}

export function writeStack(stack: Stack): string {
  const d = stack.discounts
    .map((x) => (x.kind === "percent" ? `${x.value}p` : `${toUnits(x.cents)}a`))
    .join(",");
  // Commas are left readable on purpose: the link is meant to be shared.
  return `price=${toUnits(stack.priceCents)}&cur=${stack.currency}&d=${d}`;
}
