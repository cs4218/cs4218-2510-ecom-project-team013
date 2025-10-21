import { expect, test } from "@playwright/test";

test.describe("User Login", () => {
  test("Registered user can login successfully", async ({ page }) => {
    await page.goto("/login");

    // Verify "LOGIN FORM" heading is visible
    await expect(page.getByRole("heading", { name: /login/i })).toBeVisible();

    // Fill in credentials (using pre-created test user)
    await page
      .getByPlaceholder(/enter your email/i)
      .fill("charlie@example.com");
    await page.getByPlaceholder(/enter your password/i).fill("Password");

    // Click "LOGIN" button
    await page.getByRole("button", { name: /login/i }).click();

    // Wait for navigation
    await page.waitForURL("/");

    // Verify header shows username
    await expect(page.getByRole("button", { name: /charlie/i })).toBeVisible();

    // Open user menu to verify logout option
    await page.getByRole("button", { name: /charlie/i }).click();
    await expect(page.getByRole("link", { name: /logout/i })).toBeVisible();
  });
});
