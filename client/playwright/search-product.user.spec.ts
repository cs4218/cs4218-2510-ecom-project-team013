import { expect, test } from "@playwright/test";

test.describe("Filter Product as a Logged-In User", () => {
  test("Search results only show products containing 'Wireless'", async ({
    page,
  }) => {
    await page.goto("/");

    // Perform search
    const searchInput = page.getByRole("searchbox", { name: "Search" });
    const searchButton = page.getByRole("button", { name: "Search" });
    await searchInput.click();
    await searchInput.fill("Wireless");
    await searchButton.click();

    await page.waitForSelector('[data-testid^="product-name-"]', {
      timeout: 10000,
    });

    // Verify navigation to /search
    await expect(page).toHaveURL(/\/search/);

    // Verify search results heading (note: keeping original typo)
    await expect(page.getByText(/Search Resuts|Search Results/i)).toBeVisible();

    // Check for results
    const foundMessage = page.getByText(/Found \d+/i);
    const noResultsMessage = page.getByText(/No Products Found/i);

    if (await foundMessage.isVisible()) {
      // Verify search results display matching products
      await expect(foundMessage).toBeVisible();
      await expect(page.locator(".card").first()).toBeVisible();
      // Select all product name elements
      const productNames = await page
        .locator('[data-testid^="product-name-"]')
        .all();

      // Assert at least one product appears
      expect(productNames.length).toBeGreaterThan(1);

      // Check every product name includes "Wireless"
      for (const productName of productNames) {
        const name = (await productName.textContent())?.trim() ?? "";
        expect(name.toLowerCase()).toContain("wireless");
      }
    } else {
      await expect(noResultsMessage).toBeVisible();
    }

    // Search for non-existent product
    await searchInput.fill("xyzabc123");
    if (await searchButton.isVisible()) {
      await searchButton.click();
    } else {
      await searchInput.press("Enter");
    }

    // Verify "No Products Found" message
    await expect(noResultsMessage).toBeVisible();
  });
});
