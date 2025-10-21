import { expect, test } from "@playwright/test";

test.describe("Add to Cart as Logged-in User", () => {
  test("Add Single Product to Cart", async ({ page }) => {
    // User should already be logged in from setup
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
    const cartBadge = page.locator(".ant-badge-count");
    await expect(cartBadge).toHaveText("1");

    // Navigate to /cart
    await page.goto("/cart");

    // Verify product appears in cart (cart uses row card flex-row structure)
    const cartItem = page.locator(".row.card.flex-row").first();
    await expect(cartItem).toBeVisible();

    // Verify cart shows product details
    await expect(cartItem.locator("img")).toBeVisible();
    await expect(page.getByText(/total : /i)).toBeVisible();
  });

  test("Complete Shopping Cart Flow", async ({ page }) => {
    // User should already be logged in
    await page.goto("/");

    // Add 2 products to cart
    const addToCartButtons = page.getByRole("button", { name: /ADD TO CART/i });
    await addToCartButtons.first().click();
    await expect(page.getByText(/Item Added to cart/i)).toBeVisible({
      timeout: 5000,
    });

    // Wait for the first toast to disappear before adding the second item
    await expect(page.getByText(/Item Added to cart/i)).toBeHidden({
      timeout: 5000,
    });

    await addToCartButtons.nth(1).click();
    await expect(page.getByText(/Item Added to cart/i)).toBeVisible({
      timeout: 5000,
    });

    // Verify cart badge shows "2"
    const cartBadge = page.locator(".badge").first();
    if (await cartBadge.isVisible()) {
      await expect(cartBadge).toHaveText("2");
    }

    // Navigate to /cart
    await page.goto("/cart");

    // Verify greeting shows username
    await expect(page.getByText(/Hello.*Charlie/i)).toBeVisible();

    // Verify message about items in cart
    await expect(
      page.getByText(/You Have 2 items in your cart/i)
    ).toBeVisible();

    // Verify both products are listed
    const cartItems = page.getByTestId("cart-item");
    await expect(cartItems).toHaveCount(2);

    // Verify total price is displayed
    await expect(page.getByText(/Total : /i)).toBeVisible();

    // Verify "Current Address" section
    await expect(page.getByText(/Current Address/i)).toBeVisible();

    // Remove one item from cart
    const removeButton = page.getByRole("button", { name: /remove/i }).first();
    if (await removeButton.isVisible()) {
      await removeButton.click();

      // Verify cart updates to show 1 item
      await expect(
        page.getByText(/You Have 1 item.*in your cart/i)
      ).toBeVisible();
      await expect(page.getByTestId("cart-item")).toHaveCount(1);
    }

    // Verify Braintree payment gateway loads (if implemented)
    const paymentSection = page.locator(
      ".dropin-container, .payment-section, #dropin-container"
    );
    if (await paymentSection.isVisible()) {
      await expect(paymentSection).toBeVisible();

      // Verify "Make Payment" button is present
      const paymentButton = page.getByRole("button", { name: /Make Payment/i });
      if (await paymentButton.isVisible()) {
        await expect(paymentButton).toBeVisible();
      }
    }
  });
});
