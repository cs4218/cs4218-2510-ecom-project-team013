import { expect, test } from "@playwright/test";

test.describe("Filter Product", () => {
  test("Search results only show products containing 'Wireless'", async ({
    page,
  }) => {
    await page.goto("/");

    // Perform search
    await page.getByRole("searchbox", { name: "Search" }).click();
    await page.getByRole("searchbox", { name: "Search" }).fill("Wireless");
    await page.getByRole("button", { name: "Search" }).click();

    await page.waitForSelector('[data-testid^="product-name-"]', {
      timeout: 10000,
    });

    // Select all product name elements
    const productNames = await page
      .locator('[data-testid^="product-name-"]')
      .all();

    // Assert at least one product appears (optional)
    expect(productNames.length).toBeGreaterThan(0);

    // Check every product name includes "Wireless"
    for (const productName of productNames) {
      const name = (await productName.textContent())?.trim() ?? "";
      expect(name.toLowerCase()).toContain("wireless");
    }
  });
});
