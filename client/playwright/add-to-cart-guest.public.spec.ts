import { expect, test } from "@playwright/test";

test.describe("Add to Cart as Guest", () => {
  test("Guest can add items to cart but must login to checkout", async ({
    page,
  }) => {
    await page.goto("/");

    // Click "ADD TO CART" on first product
    const firstProduct = page
      .locator(".card")
      .filter({ hasText: /\$/ })
      .first();
    await firstProduct.getByRole("button", { name: /add to cart/i }).click();

    // Verify toast notification appears
    await expect(page.getByText(/item added to cart/i)).toBeVisible();

    // Click cart icon in header and verify badge
    const cartBadge = page.locator(".badge");
    await expect(cartBadge).toHaveText("1");

    // Navigate to /cart
    await page.goto("/cart");

    // Verify product appears in cart (cart uses row card flex-row structure)
    const cartItem = page.locator(".row.card.flex-row").first();
    await expect(cartItem).toBeVisible();

    // Verify cart shows product details
    await expect(cartItem.locator("img")).toBeVisible();
    await expect(page.getByText(/total/i)).toBeVisible();

    // Verify message for guest user
    await expect(page.getByText(/please login to checkout/i)).toBeVisible();

    // Verify "Please Login to checkout" button is displayed
    await expect(
      page.getByRole("button", { name: /please login to checkout/i })
    ).toBeVisible();
  });
});
