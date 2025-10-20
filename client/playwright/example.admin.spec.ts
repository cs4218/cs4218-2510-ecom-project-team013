import { expect, test } from "@playwright/test";

test.describe("All auth pages Renders", () => {
  test("Test Pages Rendering", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Alice Tan" })).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "All Products" })
    ).toBeVisible();

    await page.getByRole("link", { name: "Categories" }).click();
    await page.getByRole("link", { name: "All Categories" }).click();
    await expect(
      page.getByText("ElectronicsBooksFashion", { exact: true })
    ).toBeVisible();
  });
});
