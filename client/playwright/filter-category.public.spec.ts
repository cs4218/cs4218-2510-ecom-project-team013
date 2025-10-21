import { expect, test } from "@playwright/test";

test.describe("Filter Products by Category", () => {
  test("Guest can filter products by category", async ({ page }) => {
    await page.goto("/");

    // Verify "Filter By Category" heading is visible
    await expect(page.getByText("Filter By Category")).toBeVisible();

    // Get initial product count
    const initialProducts = await page
      .locator(".card")
      .filter({ hasText: /\$/ })
      .count();

    // Click on a category checkbox (e.g., "Electronics")
    const categoryCheckbox = page.getByLabel(/electronics/i).first();
    await categoryCheckbox.check();

    // Wait for filter API response
    await page.waitForResponse(
      (res) => res.url().includes("/api/v1/product/product-filters") && res.ok()
    );

    // Verify products are filtered (count should be different or same)
    const filteredProducts = await page
      .locator(".card")
      .filter({ hasText: /\$/ })
      .count();
    expect(filteredProducts).toBeGreaterThan(0);

    // Click "RESET FILTERS" button
    await page.getByRole("button", { name: /reset filters/i }).click();

    // Wait for page to reload or products to refresh
    await page.waitForLoadState("networkidle");

    // Verify all products are displayed again
    const resetProducts = await page
      .locator(".card")
      .filter({ hasText: /\$/ })
      .count();
    expect(resetProducts).toBe(initialProducts);
  });
});
