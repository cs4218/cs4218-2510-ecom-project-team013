import { expect, test } from "@playwright/test";

test.describe("Search Product", () => {
  test("Able to filter by price greater than 100", async ({ page }) => {
    await page.goto("/");

    const allPriceElements = await page
      .locator('[data-testid^="product-price-"]')
      .all();
    const allPrices = await Promise.all(
      allPriceElements.map(async (el) => {
        const text = (await el.textContent())?.trim() ?? "";
        return parseFloat(text.replace(/[^0-9.]/g, ""));
      })
    );

    // Assert at least one product is < 100
    expect(allPrices.some((p) => p < 100)).toBeTruthy();

    // Perform Filter and Wait for filter API and UI
    page.getByTestId("radio-$100 or more").check();
    await page.waitForResponse(
      (res) => res.url().includes("/api/v1/product/product-filters") && res.ok()
    );
    await page.waitForSelector(
      '[data-testid^="product-price-"], [data-testid="no-products-message"]',
      { timeout: 10000 }
    );

    // Select all price elements
    const priceElements = await page
      .locator('[data-testid^="product-price-"]')
      .all();

    // Extract text from each and convert to numbers
    const prices = await Promise.all(
      priceElements.map(async (el) => {
        const text = (await el.textContent())?.trim() ?? "";
        const numeric = parseFloat(text.replace(/[^0-9.]/g, ""));
        return numeric;
      })
    );

    for (const price of prices) {
      expect(price).toBeGreaterThanOrEqual(100);
    }
  });

  test("Able to filter by price between 40 and 59", async ({ page }) => {
    await page.goto("/");

    const allPriceElements = await page
      .locator('[data-testid^="product-price-"]')
      .all();
    const allPrices = await Promise.all(
      allPriceElements.map(async (el) => {
        const text = (await el.textContent())?.trim() ?? "";
        return parseFloat(text.replace(/[^0-9.]/g, ""));
      })
    );

    // Assert at least one product not within range
    expect(allPrices.some((p) => p < 40 || p > 59)).toBeTruthy();

    // Perform Filter and Wait for filter API and UI
    page.getByTestId("radio-$40 to 59").check();
    await page.waitForResponse(
      (res) => res.url().includes("/api/v1/product/product-filters") && res.ok()
    );
    await page.waitForSelector(
      '[data-testid^="product-price-"], [data-testid="no-products-message"]',
      { timeout: 10000 }
    );

    // Select all price elements
    const priceElements = await page
      .locator('[data-testid^="product-price-"]')
      .all();

    // Extract text from each and convert to numbers
    const prices = await Promise.all(
      priceElements.map(async (el) => {
        const text = (await el.textContent())?.trim() ?? "";
        const numeric = parseFloat(text.replace(/[^0-9.]/g, ""));
        return numeric;
      })
    );

    for (const price of prices) {
      expect(price >= 40 && price <= 59).toBeTruthy();
    }
  });
});
