import { describe, expect, it } from "vitest";
import { DEFAULT_STACK, readStack, writeStack } from "../src/url";

describe("stack in the URL", () => {
  it("round-trips a stack", () => {
    const stack = {
      priceCents: 12999,
      currency: "EUR" as const,
      discounts: [
        { kind: "percent" as const, value: 25 },
        { kind: "amount" as const, cents: 1050 },
      ],
    };
    const query = writeStack(stack);
    expect(query).toBe("price=129.99&cur=EUR&d=25p,10.5a");
    expect(readStack(query)).toEqual(stack);
  });

  it("opens on $100 with 40% then 20% when there is no query", () => {
    expect(readStack("")).toEqual(DEFAULT_STACK);
    expect(DEFAULT_STACK).toEqual({
      priceCents: 10000,
      currency: "USD",
      discounts: [
        { kind: "percent", value: 40 },
        { kind: "percent", value: 20 },
      ],
    });
  });

  it("falls back to the default stack when the price is broken", () => {
    expect(readStack("price=abc&d=10p")).toEqual(DEFAULT_STACK);
    expect(readStack("price=-5&d=10p")).toEqual(DEFAULT_STACK);
  });

  it("drops one broken discount instead of the whole stack", () => {
    expect(readStack("price=50&cur=USD&d=10p,zz,150p,5a").discounts).toEqual([
      { kind: "percent", value: 10 },
      { kind: "amount", cents: 500 },
    ]);
  });

  it("uses USD for an unknown currency", () => {
    expect(readStack("price=50&cur=XYZ&d=10p").currency).toBe("USD");
  });

  it("accepts a leading question mark", () => {
    expect(readStack("?price=20&cur=GBP&d=").priceCents).toBe(2000);
  });
});
