import { test, expect, Page } from "@playwright/test";

test.describe.configure({ mode: "parallel" });

/* ---------- helpers ---------- */
function uniqueName(prefix = "Cat") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function rowByName(page: Page, name: string) {
  return page
    .locator("table")
    .getByRole("row", { name: new RegExp(name, "i") });
}

async function gotoManageCategoryViaUI(page: Page) {
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
  await page.getByRole("link", { name: /create category/i }).click();

  await expect(page.locator("h1")).toHaveText(/manage category/i);
  await expect(page.getByRole("table")).toBeVisible();
}

/* ---------- UI helpers ---------- */
async function getCategoryInput(page: Page) {
  const byPlaceholder = page.getByPlaceholder(/enter new category/i);
  if (await byPlaceholder.isVisible().catch(() => false)) return byPlaceholder;
  return page.getByTestId("category-input");
}

async function getSubmitButton(page: Page) {
  const byRole = page.getByRole("button", { name: /^submit$/i });
  if (await byRole.isVisible().catch(() => false)) return byRole;
  return page.getByTestId("submit-button");
}

async function expectToast(page: Page, re: RegExp) {
  const alert = page.getByRole("alert");
  if (await alert.isVisible().catch(() => false)) {
    await expect(alert).toContainText(re);
  } else {
    await expect(page.getByText(re)).toBeVisible();
  }
}

/* ---------- navbar dropdown ---------- */
async function openCategoriesDropdown(page: Page) {
  const trigger = page.getByRole("link", { name: /^categories$/i });

  await trigger.hover();
  let menu = page.locator(".dropdown-menu:visible");

  if (!(await menu.isVisible().catch(() => false))) {
    await trigger.click({ trial: false });
    menu = page.locator(".dropdown-menu:visible");
  }

  await expect(
    menu.locator(':scope *, :scope a, :scope [role="menuitem"]').first()
  ).toBeVisible();
  return menu;
}

async function assertNavDropdownHas(page: Page, name: string) {
  const menu = await openCategoriesDropdown(page);
  const re = new RegExp(`^${escapeRegex(name)}$`, "i");
  await expect(menu.getByText(re)).toBeVisible();
}
async function assertNavDropdownNotHas(page: Page, name: string) {
  const menu = await openCategoriesDropdown(page);
  const re = new RegExp(`^${escapeRegex(name)}$`, "i");
  await expect(menu.getByText(re)).toHaveCount(0);
}
async function assertNavDropdownHasFresh(page: Page, name: string) {
  await page.reload({ waitUntil: "networkidle" });
  await assertNavDropdownHas(page, name);
}
async function assertNavDropdownNotHasFresh(page: Page, name: string) {
  await page.reload({ waitUntil: "networkidle" });
  await assertNavDropdownNotHas(page, name);
}

/* ---------- home filter ---------- */
async function assertHomeFilterHas(page: Page, name: string) {
  await page.goto("/");
  await expect(page.getByText(/filter by category/i)).toBeVisible();
  await expect(
    page.getByLabel(new RegExp(`^${escapeRegex(name)}$`, "i"))
  ).toBeVisible();
}
async function assertHomeFilterNotHas(page: Page, name: string) {
  await page.goto("/");
  await expect(page.getByText(/filter by category/i)).toBeVisible();
  await expect(
    page.getByLabel(new RegExp(`^${escapeRegex(name)}$`, "i"))
  ).toHaveCount(0);
}

/* ---------- setup ---------- */
test.beforeEach(async ({ page }) => {
  await gotoManageCategoryViaUI(page);
});

/* ---------- tests ---------- */
test("Categories • READ shows defaults and nav/home lists reflect them", async ({
  page,
}) => {
  await expect(rowByName(page, "Electronics")).toBeVisible();
  await expect(rowByName(page, "Books")).toBeVisible();
  await expect(rowByName(page, "Fashion")).toBeVisible();

  await assertNavDropdownHas(page, "Electronics");
  await assertNavDropdownHas(page, "Books");
  await assertNavDropdownHas(page, "Fashion");

  await assertHomeFilterHas(page, "Electronics");
  await assertHomeFilterHas(page, "Books");
  await assertHomeFilterHas(page, "Fashion");
});

test("Categories • CREATE updates table, navbar dropdown (after reload) and home filter (cleanup)", async ({
  page,
}) => {
  const name = uniqueName("Cat");
  const input = await getCategoryInput(page);
  const submit = await getSubmitButton(page);

  await input.fill(name);
  await Promise.all([page.waitForLoadState("networkidle"), submit.click()]);
  await expectToast(page, new RegExp(`${escapeRegex(name)} is created`));
  await expect(rowByName(page, name)).toBeVisible();

  await assertNavDropdownHasFresh(page, name);
  await assertHomeFilterHas(page, name);

  await gotoManageCategoryViaUI(page);
  await rowByName(page, name)
    .getByRole("button", { name: /^delete$/i })
    .click();
  await expectToast(page, /category is deleted/i);
  await expect(rowByName(page, name)).toHaveCount(0);

  await assertNavDropdownNotHasFresh(page, name);
  await assertHomeFilterNotHas(page, name);
});

test("Categories • EDIT updates table, navbar dropdown (after reload) and home filter (cleanup)", async ({
  page,
}) => {
  const original = uniqueName("Cat");
  const input = await getCategoryInput(page);
  const submit = await getSubmitButton(page);

  await input.fill(original);
  await Promise.all([page.waitForLoadState("networkidle"), submit.click()]);
  await expectToast(page, new RegExp(`${escapeRegex(original)} is created`));
  await expect(rowByName(page, original)).toBeVisible();

  const edited = uniqueName("CatEdited");
  await rowByName(page, original)
    .getByRole("button", { name: /^edit$/i })
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const dlgInput = (await dialog
    .getByPlaceholder(/enter new category/i)
    .isVisible()
    .catch(() => false))
    ? dialog.getByPlaceholder(/enter new category/i)
    : dialog.getByTestId("category-input");
  const dlgSubmit = (await dialog
    .getByRole("button", { name: /^submit$/i })
    .isVisible()
    .catch(() => false))
    ? dialog.getByRole("button", { name: /^submit$/i })
    : dialog.getByTestId("submit-button");

  await dlgInput.fill(edited);
  await Promise.all([page.waitForLoadState("networkidle"), dlgSubmit.click()]);
  await expectToast(page, new RegExp(`${escapeRegex(edited)} is updated`));
  await expect(rowByName(page, edited)).toBeVisible();
  await expect(rowByName(page, original)).toHaveCount(0);

  await assertNavDropdownHasFresh(page, edited);
  await assertNavDropdownNotHasFresh(page, original);
  await assertHomeFilterHas(page, edited);
  await assertHomeFilterNotHas(page, original);

  await gotoManageCategoryViaUI(page);
  await rowByName(page, edited)
    .getByRole("button", { name: /^delete$/i })
    .click();
  await expectToast(page, /category is deleted/i);
  await expect(rowByName(page, edited)).toHaveCount(0);

  await assertNavDropdownNotHasFresh(page, edited);
  await assertHomeFilterNotHas(page, edited);
});

test("Categories • DELETE removes row and updates navbar dropdown (after reload) and home filter", async ({
  page,
}) => {
  const toDelete = uniqueName("CatDel");
  const input = await getCategoryInput(page);
  const submit = await getSubmitButton(page);

  await input.fill(toDelete);
  await Promise.all([page.waitForLoadState("networkidle"), submit.click()]);
  await expectToast(page, new RegExp(`${escapeRegex(toDelete)} is created`));
  await expect(rowByName(page, toDelete)).toBeVisible();

  await rowByName(page, toDelete)
    .getByRole("button", { name: /^delete$/i })
    .click();
  await expectToast(page, /category is deleted/i);
  await expect(rowByName(page, toDelete)).toHaveCount(0);

  await assertNavDropdownNotHasFresh(page, toDelete);
  await assertHomeFilterNotHas(page, toDelete);
});

test('Categories • DUPLICATE shows "Something went wrong in input form" and keeps single row (cleanup)', async ({
  page,
}) => {
  const name = uniqueName("CatDup");
  const input = await getCategoryInput(page);
  const submit = await getSubmitButton(page);

  await input.fill(name);
  await Promise.all([page.waitForLoadState("networkidle"), submit.click()]);
  await expectToast(page, new RegExp(`${escapeRegex(name)} is created`));
  await expect(rowByName(page, name)).toBeVisible();

  await (await getCategoryInput(page)).fill(name);
  await Promise.all([
    page.waitForLoadState("networkidle"),
    (await getSubmitButton(page)).click(),
  ]);
  await expectToast(page, /Something went wrong in input form/i);
  await expect(rowByName(page, name)).toHaveCount(1);

  await rowByName(page, name)
    .getByRole("button", { name: /^delete$/i })
    .click();
  await expectToast(page, /category is deleted/i);
  await expect(rowByName(page, name)).toHaveCount(0);
});
