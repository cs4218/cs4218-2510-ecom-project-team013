import { expect, test } from "@playwright/test";

test.describe("Add to Cart as Guest", () => {
  test("Guest can add items to cart but must login to checkout", async ({
    page,
  }) => {
    await page.goto("/");

    // Wait for products to load
    await page.waitForSelector(".card");

    // Click "ADD TO CART" on first product
    const firstProduct = page
      .locator(".card")
      .filter({ hasText: /\$/ })
      .first();
    await firstProduct.getByRole("button", { name: /add to cart/i }).click();

    // Verify toast notification appears
    await expect(page.getByText(/item added to cart/i)).toBeVisible();

    // Verify cart badge updates to show "1"
    const cartBadge = page.locator(".ant-badge-count");
    await expect(cartBadge).toHaveText("1");

    // Navigate to /cart
    await page.goto("/cart");

    // Verify greeting shows "Hello Guest"
    await expect(page.getByText(/hello guest/i)).toBeVisible();

    // Verify cart message for guest users
    await expect(
      page.getByText(/you have.*items in your cart please login to checkout/i)
    ).toBeVisible();

    // Verify product appears in cart (uses .row.card.flex-row structure)
    const cartItem = page.locator(".row.card.flex-row").first();
    await expect(cartItem).toBeVisible();

    // Verify cart shows product image and price
    await expect(cartItem.locator("img")).toBeVisible();
    await expect(cartItem.getByText(/price/i)).toBeVisible();

    // Verify cart summary shows total
    await expect(page.getByText(/total/i)).toBeVisible();

    // Verify "Please Login to checkout" button (note: typo in source code)
    await expect(
      page.getByRole("button", { name: /please login to checkout/i })
    ).toBeVisible();
  });
});
