import { expect, test } from "@playwright/test";

test.describe("View Product Details", () => {
  test("Guest can view detailed product information", async ({ page }) => {
    await page.goto("/");

    // Click "More Details" on the first product
    const firstProduct = page
      .locator(".card")
      .filter({ hasText: /\$/ })
      .first();
    await firstProduct.getByRole("button", { name: /more details/i }).click();

    // Verify navigation to /product/:slug
    await expect(page).toHaveURL(/\/product\/.+/);

    // Verify product details page shows required elements
    await expect(
      page.getByRole("heading", { name: /product details/i })
    ).toBeVisible();

    // Verify product image
    await expect(page.locator("img").first()).toBeVisible();

    // Verify price is displayed
    await expect(page.locator("text=/\\$/")).toBeVisible();

    // Verify "ADD TO CART" button
    await expect(
      page.getByRole("button", { name: /add to cart/i })
    ).toBeVisible();

    // Scroll down to check for "Similar Products" section
    const similarProductsHeading = page.getByText(/similar products/i);
    const hasSimilarProducts = await similarProductsHeading
      .isVisible()
      .catch(() => false);

    if (hasSimilarProducts) {
      // If similar products exist, verify they are displayed
      const similarProductCards = page
        .locator(".card")
        .filter({ hasText: /\$/ });
      const count = await similarProductCards.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});
