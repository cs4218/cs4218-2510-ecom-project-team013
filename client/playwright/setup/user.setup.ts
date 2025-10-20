import { expect, test as setup } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../.auth/user.json");

setup("authenticate as normal user", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Login" }).click();

  await page
    .getByRole("textbox", { name: "Enter Your Email" })
    .fill("charlie@example.com");
  await page
    .getByRole("textbox", { name: "Enter Your Password" })
    .fill("Password");

  await page.getByRole("button", { name: "LOGIN" }).click();

  await expect(page.getByRole("button", { name: "Charlie Lee" })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
