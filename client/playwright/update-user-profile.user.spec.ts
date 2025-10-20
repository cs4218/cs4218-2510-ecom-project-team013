import { test, expect, Page } from "@playwright/test";

test.describe.configure({ mode: "parallel" });

/* ---------- helpers ---------- */
function uniqueSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
}

async function openUserMenu(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const nameRe = /charlie\s*lee/i;

  const btn = (await page
    .getByRole("link", { name: nameRe })
    .isVisible()
    .catch(() => false))
    ? page.getByRole("link", { name: nameRe })
    : (await page
          .getByRole("button", { name: nameRe })
          .isVisible()
          .catch(() => false))
      ? page.getByRole("button", { name: nameRe })
      : page.getByRole("button").filter({
          hasText: /charlie|profile|account|user|menu/i,
        });

  await btn.click();
  return btn;
}

async function gotoUserDashboard(page: Page) {
  await openUserMenu(page);
  await page.getByRole("link", { name: /dashboard/i }).click();

  // Allow minor heading text variants
  await expect(
    page.getByRole("heading", { name: /dashboard|user dashboard/i })
  ).toBeVisible();

  // The simple card with 3 <h3> lines
  await expect(page.locator(".card.w-75")).toBeVisible();
}

async function gotoProfile(page: Page) {
  await page.getByRole("link", { name: /^profile$/i }).click();
  await expect(
    page.getByRole("heading", { name: /user profile/i })
  ).toBeVisible();
}

async function readDashboardCard(page: Page) {
  const card = page.locator(".card.w-75");
  const texts = (await card.locator("h3").allTextContents()).map((t) =>
    t.trim()
  );
  const [name = "", email = "", address = ""] = texts;
  return { name, email, address };
}

async function expectToast(page: Page, re: RegExp) {
  const alert = page.getByRole("alert");
  if (await alert.isVisible().catch(() => false)) {
    await expect(alert).toContainText(re);
  } else {
    await expect(page.getByText(re)).toBeVisible();
  }
}

async function submitProfile(page: Page) {
  const submit = page.getByRole("button", { name: /^update$/i });
  await Promise.all([page.waitForLoadState("networkidle"), submit.click()]);
}

/* ---------- setup ---------- */
test.beforeEach(async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
});

/* ---------- tests ---------- */

test("Profile • READ dashboard values and email is disabled on Profile", async ({
  page,
}) => {
  await gotoUserDashboard(page);
  const { name, email, address } = await readDashboardCard(page);
  expect(name).toBeTruthy();
  expect(email).toMatch(/@/);
  expect(address).toBeTruthy();

  await gotoProfile(page);
  await expect(page.getByPlaceholder(/enter your email/i)).toBeDisabled();
  await expect(page.getByPlaceholder(/enter your name/i)).toHaveValue(name);
  await expect(page.getByPlaceholder(/enter your address/i)).toHaveValue(
    address
  );
});

test.describe("Profile • field-by-field updates", () => {
  test.describe.configure({ mode: "serial" });

  test("UPDATE name only → dashboard shows new name", async ({ page }) => {
    await gotoUserDashboard(page);
    const original = await readDashboardCard(page);

    await gotoProfile(page);
    const newName = `${original.name} ${uniqueSuffix()}`;
    await page.getByPlaceholder(/enter your name/i).fill(newName);
    await submitProfile(page);
    await expectToast(page, /profile updated successfully/i);

    await gotoUserDashboard(page);
    const after = await readDashboardCard(page);
    expect(after.name).toBe(newName);
    expect(after.email).toBe(original.email);
    expect(after.address).toBe(original.address);

    await gotoProfile(page);
    await page.getByPlaceholder(/enter your name/i).fill(original.name);
    await submitProfile(page);
    await expectToast(page, /profile updated successfully/i);
  });

  test("UPDATE address only → dashboard shows new address", async ({
    page,
  }) => {
    await gotoUserDashboard(page);
    const original = await readDashboardCard(page);

    await gotoProfile(page);
    const newAddress = `Addr ${uniqueSuffix()}`;
    await page.getByPlaceholder(/enter your address/i).fill(newAddress);
    await submitProfile(page);
    await expectToast(page, /profile updated successfully/i);

    await gotoUserDashboard(page);
    const after = await readDashboardCard(page);
    expect(after.name).toBe(original.name);
    expect(after.email).toBe(original.email);
    expect(after.address).toBe(newAddress);

    await gotoProfile(page);
    await page.getByPlaceholder(/enter your address/i).fill(original.address);
    await submitProfile(page);
    await expectToast(page, /profile updated successfully/i);
  });

  test("UPDATE phone only → dashboard unchanged; profile shows new phone", async ({
    page,
  }) => {
    await gotoUserDashboard(page);
    const original = await readDashboardCard(page);

    await gotoProfile(page);
    const newPhone = `8${Math.floor(1000000 + Math.random() * 8999999)}`;
    await page.getByPlaceholder(/enter your phone/i).fill(newPhone);
    await submitProfile(page);
    await expectToast(page, /profile updated successfully/i);

    await gotoUserDashboard(page);
    const after = await readDashboardCard(page);
    expect(after.name).toBe(original.name);
    expect(after.email).toBe(original.email);
    expect(after.address).toBe(original.address);

    await gotoProfile(page);
    await expect(page.getByPlaceholder(/enter your phone/i)).toHaveValue(
      newPhone
    );
  });
});

test("Profile • VALIDATION: password < 6 chars shows error and dashboard unchanged", async ({
  page,
}) => {
  await gotoUserDashboard(page);
  const before = await readDashboardCard(page);

  await gotoProfile(page);
  await page.getByPlaceholder(/enter your password/i).fill("12345");
  await submitProfile(page);

  await expectToast(
    page,
    /(passsword is required and 6 character long|something went wrong|failed)/i
  );

  await gotoUserDashboard(page);
  const after = await readDashboardCard(page);
  expect(after.name).toBe(before.name);
  expect(after.email).toBe(before.email);
  expect(after.address).toBe(before.address);
});
