import { expect, test } from "@playwright/test";

test.describe("User Registration", () => {
  test("New user can create an account successfully", async ({ page }) => {
    await page.goto("/register");

    // Verify "REGISTER FORM" heading is visible
    await expect(
      page.getByRole("heading", { name: /register/i })
    ).toBeVisible();

    // Fill in registration form with unique email
    const uniqueEmail = `test-${Date.now()}@example.com`;

    await page.getByPlaceholder(/enter your name/i).fill("John Doe");
    await page.getByPlaceholder(/enter your email/i).fill(uniqueEmail);
    await page.getByPlaceholder(/enter your password/i).fill("Test@123456");
    await page.getByPlaceholder(/enter your phone/i).fill("1234567890");
    await page.getByPlaceholder(/enter your address/i).fill("123 Test Street");
    await page.getByPlaceholder(/enter your dob/i).fill("2000-01-01");
    await page
      .getByPlaceholder(/what is your favorite sport/i)
      .fill("Football");

    // Click "REGISTER" button
    await page.getByRole("button", { name: /register/i }).click();

    // Verify toast message
    await expect(page.getByText(/register successfully/i)).toBeVisible();

    // Verify navigation to /login
    await expect(page).toHaveURL(/\/login/);
  });
});
