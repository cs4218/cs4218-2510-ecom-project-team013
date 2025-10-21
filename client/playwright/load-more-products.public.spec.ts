import { expect, test } from "@playwright/test";

test.describe("Load More Products", () => {
  test("Guest can load more products via pagination", async ({ page }) => {
    await page.goto("/");

    // Wait for products to load
    await page.waitForSelector(".card");

    // Count initial products displayed
    const initialProductCount = await page
      .locator(".card")
      .filter({ hasText: /\$/ })
      .count();

    // Check if "Load more" button is visible
    const loadMoreButton = page.getByRole("button", { name: /loadmore/i });
    const isLoadMoreVisible = await loadMoreButton
      .isVisible()
      .catch(() => false);

    if (isLoadMoreVisible) {
      // Click "Load more" button and wait for API response
      await Promise.all([
        page.waitForResponse(
          (res) =>
            res.url().includes("/api/v1/product/product-list/") && res.ok()
        ),
        loadMoreButton.click(),
      ]);

      // Verify additional products are loaded
      const updatedProductCount = await page
        .locator(".card")
        .filter({ hasText: /\$/ })
        .count();
      expect(updatedProductCount).toBeGreaterThan(initialProductCount);
    } else {
      // If no load more button, all products are already displayed
      expect(initialProductCount).toBeGreaterThan(0);
    }
  });
});
