import { describe, expect, it } from "vitest";
import { formatMoney, formatPercent } from "../src/format";

describe("formatPercent", () => {
  it("drops a trailing .0", () => {
    expect(formatPercent(52)).toBe("52%");
  });
  it("keeps one decimal", () => {
    expect(formatPercent(56.8)).toBe("56.8%");
  });
});

describe("formatMoney", () => {
  it("formats cents in the stack's currency", () => {
    expect(formatMoney(4800, "USD", "en-US")).toBe("$48.00");
    expect(formatMoney(129999, "EUR", "en-US")).toBe("€1,299.99");
  });
});
