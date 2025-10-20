import { expect, test } from "@playwright/test";

test.describe("Update Product", () => {
  test("Update Product Success", async ({ page }) => {
    await page.goto("/dashboard/admin/products");
    await page.getByTestId("div-product-smartphone-x").click();

    // Update Product Name
    await page.getByTestId("name-input").click();
    await page.getByTestId("name-input").fill("Update Product Name");

    // Update Product Description
    await page.getByTestId("description-input").click();
    await page
      .getByTestId("description-input")
      .fill("Update Product Description");

    // Update
    await page.getByTestId("update-btn").click();

    // Assertions
    await expect(page.getByText("Product Updated Successfully")).toBeVisible();
    await expect(
      page.getByTestId("div-product-Update-Product-Name").getByRole("heading")
    ).toContainText("Update Product Name");
    await expect(
      page.getByTestId("div-product-Update-Product-Name").getByRole("paragraph")
    ).toContainText("Update Product Description");
  });

  test("Missing Name field warn user", async ({ page }) => {
    await page.goto("/dashboard/admin/products");
    await page.getByTestId("div-product-0").click();

    // Update Name
    await page.getByTestId("name-input").click();
    await page.getByTestId("name-input").fill("");

    // Update
    await page.getByTestId("update-btn").click();

    // Assertions
    await expect(page.getByText("Name is Required")).toBeVisible();
  });

  test("Missing Description field warn user", async ({ page }) => {
    await page.goto("/dashboard/admin/products");
    await page.getByTestId("div-product-0").click();

    // Update Description
    await page.getByTestId("description-input").click();
    await page.getByTestId("description-input").fill("");

    // Update
    await page.getByTestId("update-btn").click();

    // Assertions
    await expect(page.getByText("Description is Required")).toBeVisible();
  });

  test("Missing Price field warn user", async ({ page }) => {
    await page.goto("/dashboard/admin/products");
    await page.getByTestId("div-product-0").click();

    // Update Price
    await page.getByTestId("price-input").click();
    await page.getByTestId("price-input").fill("");

    // Update
    await page.getByTestId("update-btn").click();

    // Assertions
    await expect(page.getByText("Price is Required")).toBeVisible();
  });

  test("Missing Quantity field warn user", async ({ page }) => {
    await page.goto("/dashboard/admin/products");
    await page.getByTestId("div-product-0").click();

    // Update Quantity
    await page.getByTestId("quantity-input").click();
    await page.getByTestId("quantity-input").fill("");

    // Update
    await page.getByTestId("update-btn").click();

    // Assertions
    await expect(page.getByText("Quantity is Required")).toBeVisible();
  });
});
