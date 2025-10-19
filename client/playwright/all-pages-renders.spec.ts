import { expect, test } from "@playwright/test";

test.describe("All pages Renders", () => {
  test("about link", async ({ page }) => {
    await page.goto("/");

    const footer = page.locator(".footer");
    await footer.getByRole("link", { name: "About" }).click();

    await expect(page).toHaveURL("/about");
  });
});
