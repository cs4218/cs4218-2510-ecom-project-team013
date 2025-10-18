import { test, expect, Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test.describe.configure({ mode: "parallel" });

function uniqueName(prefix = "Prod") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function login(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: /login/i }).click();
  await page
    .getByRole("textbox", { name: /enter your email/i })
    .fill(process.env.ADMIN_EMAIL || "e0772448@u.nus.edu");
  await page
    .getByRole("textbox", { name: /enter your password/i })
    .fill(process.env.ADMIN_PASSWORD || "123123");
  await page.getByRole("button", { name: /^login$/i }).click();
}
async function gotoCreateProduct(page: Page) {
  const menu = (await page
    .getByRole("button", { name: /ma/i })
    .isVisible()
    .catch(() => false))
    ? page.getByRole("button", { name: /ma/i })
    : page.getByRole("button").filter({ hasText: /ma/i });
  await menu.click();
  await page.getByRole("link", { name: /dashboard/i }).click();
  await page.getByRole("link", { name: /create product/i }).click();
  await expect(
    page.getByRole("heading", { name: /create product/i })
  ).toBeVisible();
}
async function expectToast(page: Page, re: RegExp) {
  const alert = page.getByRole("alert");
  if (await alert.isVisible().catch(() => false))
    await expect(alert).toContainText(re);
  else await expect(page.getByText(re)).toBeVisible();
}
function tmpPng(): string {
  const b64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";
  const p = path.join(os.tmpdir(), `pw-${Date.now()}.png`);
  fs.writeFileSync(p, Buffer.from(b64, "base64"));
  return p;
}
async function uploadPhoto(page: Page) {
  await page
    .locator('input[type="file"][name="photo"]')
    .setInputFiles(tmpPng());
}
async function selectFromAntD(page: Page, testId: string, optionText: string) {
  await page.getByTestId(testId).click({ force: true });
  const panel = page.locator(".ant-select-dropdown:visible").first();
  await expect(panel).toBeVisible();
  await panel.getByText(new RegExp(`^${optionText}$`, "i")).click();
}
async function submit(page: Page) {
  const btn = page.getByRole("button", { name: /create product/i });
  await Promise.all([page.waitForLoadState("networkidle"), btn.click()]);
}

/* form filler */
type FillOpts = {
  category?: string | null;
  withPhoto?: boolean;
  name?: string | null;
  description?: string | null;
  price?: string | null;
  quantity?: string | null;
  shipping?: "Yes" | "No" | null;
};
async function fillProduct(page: Page, o: FillOpts) {
  if (o.category) await selectFromAntD(page, "category-select", o.category);
  if (o.withPhoto) await uploadPhoto(page);
  if (o.name !== undefined)
    await page.getByPlaceholder(/write a name/i).fill(o.name ?? "");
  if (o.description !== undefined)
    await page
      .getByPlaceholder(/write a description/i)
      .fill(o.description ?? "");
  if (o.price !== undefined)
    await page.getByPlaceholder(/write a Price/i).fill(o.price ?? "");
  if (o.quantity !== undefined)
    await page.getByPlaceholder(/write a quantity/i).fill(o.quantity ?? "");
  if (o.shipping) await selectFromAntD(page, "shipping-select", o.shipping);
}

test.beforeEach(async ({ page }) => {
  await login(page);
  await gotoCreateProduct(page);
});

/* validations */
test("Product • VALIDATION empty submit → 'something went wrong'", async ({
  page,
}) => {
  await submit(page);
  await expectToast(page, /something went wrong/i);
  await expect(
    page.getByRole("heading", { name: /create product/i })
  ).toBeVisible();
});

test("Product • CREATE with Shipping Yes (redirects to Products and visible on home)", async ({
  page,
}) => {
  const name = uniqueName("Prod");
  await fillProduct(page, {
    category: "Clothing",
    withPhoto: true,
    name,
    description: "Test product",
    price: "19.99",
    quantity: "5",
    shipping: "Yes",
  });

  await submit(page);

  await page.goto("/");
  await expect(page.getByText(name, { exact: false })).toBeVisible();
});

test("Product • CREATE with Shipping No (redirect)", async ({ page }) => {
  const name = uniqueName("ProdNoShip");
  await fillProduct(page, {
    category: "Book",
    withPhoto: true,
    name,
    description: "No shipping product",
    price: "9.50",
    quantity: "2",
    shipping: "No",
  });
  await submit(page);

  await page.goto("/");
  await expect(page.getByText(name, { exact: false })).toBeVisible();
});

/* single-field-missing */
test("Product • MISSING category → error", async ({ page }) => {
  const name = uniqueName("ProdMissCat");
  await fillProduct(page, {
    category: null,
    withPhoto: true,
    name,
    description: "desc",
    price: "10",
    quantity: "1",
    shipping: "Yes",
  });
  await submit(page);
  await expectToast(page, /something went wrong/i);
});

test("Product • MISSING photo → error", async ({ page }) => {
  const name = uniqueName("ProdMissPhoto");
  await fillProduct(page, {
    category: "Electronics",
    withPhoto: false,
    name,
    description: "desc",
    price: "10",
    quantity: "1",
    shipping: "Yes",
  });
  await submit(page);
  await expectToast(page, /something went wrong/i);
});

test("Product • MISSING name → error", async ({ page }) => {
  await fillProduct(page, {
    category: "Clothing",
    withPhoto: true,
    name: "",
    description: "desc",
    price: "10",
    quantity: "1",
    shipping: "Yes",
  });
  await submit(page);
  await expectToast(page, /something went wrong/i);
});

test("Product • MISSING description → error", async ({ page }) => {
  const name = uniqueName("ProdMissDesc");
  await fillProduct(page, {
    category: "Book",
    withPhoto: true,
    name,
    description: "",
    price: "10",
    quantity: "1",
    shipping: "Yes",
  });
  await submit(page);
  await expectToast(page, /something went wrong/i);
});

test("Product • MISSING price → error", async ({ page }) => {
  const name = uniqueName("ProdMissPrice");
  await fillProduct(page, {
    category: "Book",
    withPhoto: true,
    name,
    description: "desc",
    price: "",
    quantity: "1",
    shipping: "Yes",
  });
  await submit(page);
  await expectToast(page, /something went wrong/i);
});

test("Product • MISSING quantity → error", async ({ page }) => {
  const name = uniqueName("ProdMissQty");
  await fillProduct(page, {
    category: "Clothing",
    withPhoto: true,
    name,
    description: "desc",
    price: "10",
    quantity: "",
    shipping: "Yes",
  });
  await submit(page);
  await expectToast(page, /something went wrong/i);
});

test("Product • MISSING shipping → error", async ({ page }) => {
  const name = uniqueName("ProdMissShip");
  await fillProduct(page, {
    category: "Electronics",
    withPhoto: true,
    name,
    description: "desc",
    price: "10",
    quantity: "1",
    shipping: null,
  });
  await submit(page);
  await expectToast(page, /something went wrong/i);
});

/* negative price */
test("Product • NEGATIVE price → error", async ({ page }) => {
  const name = uniqueName("ProdNegPrice");
  await fillProduct(page, {
    category: "Book",
    withPhoto: true,
    name,
    description: "desc",
    price: "-5",
    quantity: "1",
    shipping: "No",
  });
  await submit(page);
  await expectToast(page, /something went wrong/i);
});
