import { expect, test, type Page } from "@playwright/test";

const result = (page: Page) => page.getByRole("status");

test("opens on the 40% + 20% example and shows the real discount", async ({ page }) => {
  await page.goto("/");
  await expect(result(page)).toHaveText("You pay $48.00. That's 52% off, not 60%.");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Is it really 60% off?");
  await expect(page.getByTestId("steps").getByRole("listitem")).toHaveText([
    "$100.00 → −40% → $60.00",
    "$60.00 → −20% → $48.00",
  ]);
});

test("adding a discount updates the result and the URL", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add % off" }).click();
  const third = page.getByLabel("Discount 3 (%)");
  await expect(third).toBeFocused();
  await third.fill("10");
  await expect(result(page)).toHaveText("You pay $43.20. That's 56.8% off, not 70%.");
  await expect(page).toHaveURL(/d=40p,20p,10p/);
});

test("changing the price and adding a fixed amount", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Original price").fill("200");
  await page.getByRole("button", { name: "Add $ off" }).click();
  await page.getByLabel("Discount 3 ($)").fill("16");
  await expect(result(page)).toHaveText("You pay $80.00. That's 60% off, not 68%.");
});

test("removes a discount by keyboard", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Remove discount 2 (−20%)" }).focus();
  await page.keyboard.press("Enter");
  await expect(result(page)).toHaveText("You pay $60.00. That's 40% off.");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Is it really 40% off?");
});

test("a shared link restores the same stack", async ({ page }) => {
  await page.goto("/?price=200&cur=EUR&d=50p,10a");
  await expect(page.getByLabel("Original price")).toHaveValue("200");
  await expect(page.getByLabel("Currency")).toHaveValue("EUR");
  await expect(result(page)).toHaveText("You pay €90.00. That's 55% off.");
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`text passes 4.5:1 contrast in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    const ratios = await page.evaluate(() => {
      const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
      const lum = ([r = 0, g = 0, b = 0]: number[]) => {
        const f = (v: number) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const background = (el: Element | null): number[] => {
        while (el) {
          const c = parse(getComputedStyle(el).backgroundColor);
          if (c.length === 3 || (c[3] ?? 0) > 0) return c;
          el = el.parentElement;
        }
        return [255, 255, 255];
      };
      const selectors = ["h1", "[role=status]", "label", "[data-testid=steps] li", "footer", "button"];
      return selectors.flatMap((sel) =>
        [...document.querySelectorAll(sel)].map((el) => {
          const a = lum(parse(getComputedStyle(el).color));
          const b = lum(background(el));
          return { sel, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
        }),
      );
    });
    expect(ratios.length).toBeGreaterThan(5);
    for (const { sel, ratio } of ratios) expect(ratio, sel).toBeGreaterThanOrEqual(4.5);
  });
}
