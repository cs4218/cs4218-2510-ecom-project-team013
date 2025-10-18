import { expect, test } from "@playwright/test";

test("has title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("ALL Products - Best offers");
});

test("about link", async ({ page }) => {
  await page.goto("/");

  // Click the about link
  const footer = page.locator(".footer");
  await footer.getByRole("link", { name: "About" }).click();

  // Expects page to be redirected to correct URL
  await expect(page).toHaveURL("/about");
});
