import { expect, test } from "@playwright/test";

test.describe("Delete Product", () => {
  test("Delete Product Success", async ({ page }) => {
    await page.goto("/dashboard/admin/products");
    await page.getByTestId("div-product-0").click();

    // Delete Product
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByTestId("delete-btn").click();

    // Assertions
    await expect(page.getByText("Product Deleted Successfully")).toBeVisible();
  });

  test("Delete Product Cancel, product not deleted", async ({ page }) => {
    await page.goto("/dashboard/admin/products");

    const originalProductName = await page
      .getByTestId("div-product-0")
      .textContent();

    await page.getByTestId("div-product-0").click();

    // Delete Product Cancel
    page.once("dialog", async (dialog) => {
      await dialog.dismiss();
    });
    await page.getByTestId("delete-btn").click();

    // Assertions
    await page.goto("/dashboard/admin/products");
    await expect(page.getByTestId("div-product-0")).toHaveText(
      originalProductName!
    );
  });
});
