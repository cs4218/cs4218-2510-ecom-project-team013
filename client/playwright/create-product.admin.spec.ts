import { expect, Page, test } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test.describe.configure({ mode: "parallel" });

function uniqueName(prefix = "Prod") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function gotoCreateProduct(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const userMenuButton = (await page
    .getByRole("button", {
      name: /alice/i,
    })
    .isVisible()
    .catch(() => false))
    ? page.getByRole("button", {
        name: /alice/i,
      })
    : page.getByRole("button").filter({
        hasText: /alice/i,
      });

  await userMenuButton.click();
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

async function waitForProductsListing(page: Page) {
  await expect
    .poll(
      async () => {
        const urlHasProducts = /\/products/i.test(page.url());
        const h1 = await page
          .locator("h1")
          .first()
          .textContent()
          .catch(() => "");
        const h1LooksRight = /all products|products/i.test(h1 || "");
        return urlHasProducts || h1LooksRight;
      },
      {
        timeout: 10_000,
        message: "Did not land on a Products listing after creating a product",
      }
    )
    .toBe(true);
}

async function expectProductVisibleSomewhere(page: Page, name: string) {
  const onList = await page
    .getByText(name, { exact: false })
    .isVisible()
    .catch(() => false);
  if (onList) {
    await expect(page.getByText(name, { exact: false })).toBeVisible();
    return;
  }

  await page.goto("/");
  await expect(page.getByText(name, { exact: false })).toBeVisible();
}

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

/* ---------- setup: rely on storageState from auth project ---------- */
test.beforeEach(async ({ page }) => {
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
    category: "Fashion",
    withPhoto: true,
    name,
    description: "Test product",
    price: "19.99",
    quantity: "5",
    shipping: "Yes",
  });

  await submit(page);

  await waitForProductsListing(page);
  await expectProductVisibleSomewhere(page, name);
});

test("Product • CREATE with Shipping No (redirect)", async ({ page }) => {
  const name = uniqueName("ProdNoShip");
  await fillProduct(page, {
    category: "Books",
    withPhoto: true,
    name,
    description: "No shipping product",
    price: "9.50",
    quantity: "2",
    shipping: "No",
  });

  await submit(page);

  await waitForProductsListing(page);
  await expectProductVisibleSomewhere(page, name);
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
    category: "Fashion",
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
    category: "Books",
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
    category: "Books",
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
    category: "Fashion",
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
    category: "Books",
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
