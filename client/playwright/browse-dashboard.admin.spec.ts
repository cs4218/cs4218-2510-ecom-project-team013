import { expect, test } from "@playwright/test";

test.describe("Browse Dashboard as Admin", () => {
  test("Navigates and Sees Dashboard Items", async ({ page }) => {
    // Admin should already be logged in from setup
    await page.goto("/");

    // Navigate to admin dashboard
    await page.goto("/dashboard/admin");

    // Verify "Admin Panel" heading
    await expect(
      page.getByRole("heading", { name: /Admin Panel/i })
    ).toBeVisible();

    // Verify admin menu shows required links
    const adminMenuItems = [
      "Create Category",
      "Create Product",
      "Products",
      "Orders",
    ];

    for (const menuItem of adminMenuItems) {
      const link = page.getByRole("link", { name: new RegExp(menuItem, "i") });
      await expect(link).toBeVisible();

      // Verify links are clickable by checking they have href
      const href = await link.getAttribute("href");
      expect(href).toBeTruthy();
    }

    // Test navigation to each menu item
    await page.getByRole("link", { name: /Create Category/i }).click();
    await expect(page).toHaveURL(/create-category/);

    await page.getByRole("link", { name: /Create Product/i }).click();
    await expect(page).toHaveURL(/create-product/);

    await page.getByRole("link", { name: /Products/i }).click();
    await expect(page).toHaveURL(/products/);
    // Should be able to see list of .product-link cards
    const productList = page.locator(".product-link");
    await expect(productList.first()).toBeVisible();

    await page.getByRole("link", { name: /Orders/i }).click();
    await expect(page).toHaveURL(/orders/);
    // Should be able to see list of orders
    const orderList = page.locator("tr");
    await expect(orderList.first()).toBeVisible();
  });
});
