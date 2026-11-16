export type Discount = { kind: "percent"; value: number } | { kind: "amount"; cents: number };

export type Step = { discount: Discount; beforeCents: number; afterCents: number };

export type Result = {
  finalCents: number;
  /** How much cheaper the final price really is, 0-100, one decimal. */
  realPercent: number;
  /** What the advertised numbers add up to, 0-100. */
  soundsLikePercent: number;
  steps: Step[];
};

const oneDecimal = (n: number) => Math.round(n * 10) / 10;

/** Applies each discount to the price left by the one before it, rounding to the cent each time. */
export function applyStack(priceCents: number, discounts: Discount[]): Result {
  const steps: Step[] = [];
  let current = priceCents;

  for (const discount of discounts) {
    const cut = discount.kind === "percent" ? Math.round((current * discount.value) / 100) : discount.cents;
    const after = Math.max(0, current - cut);
    steps.push({ discount, beforeCents: current, afterCents: after });
    current = after;
  }

  const advertised = discounts.reduce(
    (sum, d) => sum + (d.kind === "percent" ? d.value : (d.cents / priceCents) * 100),
    0,
  );

  return {
    finalCents: current,
    realPercent: priceCents > 0 ? oneDecimal((1 - current / priceCents) * 100) : 0,
    soundsLikePercent: priceCents > 0 ? oneDecimal(Math.min(100, advertised)) : 0,
    steps,
  };
}
