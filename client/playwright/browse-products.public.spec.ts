import { expect, test } from "@playwright/test";

test.describe("Browse Products as Guest", () => {
  test("Guest can view products on homepage", async ({ page }) => {
    await page.goto("/");

    // Verify banner image is displayed
    await expect(page.locator("img").first()).toBeVisible();

    // Verify "All Products" heading is visible
    await expect(page.getByText("All Products")).toBeVisible();

    // Verify product cards are displayed (at least 1)
    const productCards = page.locator(".card").filter({ hasText: /\$/ });
    await expect(productCards.first()).toBeVisible();

    // Verify first product card has required elements
    const firstCard = productCards.first();
    await expect(firstCard.locator("img")).toBeVisible();
    await expect(
      firstCard.getByRole("button", { name: /more details/i })
    ).toBeVisible();
    await expect(
      firstCard.getByRole("button", { name: /add to cart/i })
    ).toBeVisible();
  });
});
