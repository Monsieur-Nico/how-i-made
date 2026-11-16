import { describe, expect, it } from "vitest";
import { applyStack, type Discount } from "../src/calc";

const pct = (value: number): Discount => ({ kind: "percent", value });
const off = (cents: number): Discount => ({ kind: "amount", cents });

describe("applyStack", () => {
  it("takes the second discount off the already reduced price", () => {
    const r = applyStack(10000, [pct(40), pct(20)]);
    expect(r.finalCents).toBe(4800);
    expect(r.realPercent).toBe(52);
    expect(r.soundsLikePercent).toBe(60);
  });

  it("lists every step from the original price to the final one", () => {
    const r = applyStack(10000, [pct(40), pct(20)]);
    expect(r.steps.map((s) => [s.beforeCents, s.afterCents])).toEqual([
      [10000, 6000],
      [6000, 4800],
    ]);
  });

  it("gives a different price when an amount comes before or after a percentage", () => {
    const amountFirst = applyStack(10000, [off(1000), pct(50)]);
    const percentFirst = applyStack(10000, [pct(50), off(1000)]);
    expect(amountFirst.finalCents).toBe(4500);
    expect(percentFirst.finalCents).toBe(4000);
  });

  it("rounds to the cent at every step, like a checkout", () => {
    // 1999 - round(299.85) = 1699; 1699 - round(169.9) = 1529
    const r = applyStack(1999, [pct(15), pct(10)]);
    expect(r.steps.map((s) => s.afterCents)).toEqual([1699, 1529]);
  });

  it("never goes below zero", () => {
    const r = applyStack(5000, [off(3000), off(3000)]);
    expect(r.finalCents).toBe(0);
    expect(r.realPercent).toBe(100);
  });

  it("is 0% off with no discounts", () => {
    const r = applyStack(10000, []);
    expect(r.finalCents).toBe(10000);
    expect(r.realPercent).toBe(0);
    expect(r.soundsLikePercent).toBe(0);
  });

  it("counts a fixed amount as a share of the original price in what it sounds like", () => {
    expect(applyStack(10000, [pct(40), off(1000)]).soundsLikePercent).toBe(50);
  });

  it("caps what it sounds like at 100%", () => {
    expect(applyStack(10000, [pct(70), pct(50)]).soundsLikePercent).toBe(100);
  });

  it("keeps one decimal of the real percentage", () => {
    expect(applyStack(10000, [pct(40), pct(20), pct(10)]).realPercent).toBe(56.8);
  });
});
