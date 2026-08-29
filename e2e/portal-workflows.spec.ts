import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/passbook",
  "/member",
  "/manage",
  "/online-services",
  "/withdraw",
  "/withdraw/preflight",
  "/employer",
  "/employer/requests",
];

const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 720 },
];

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/demo", { data: { action: "RESET" } });
  expect(response.ok()).toBeTruthy();
});

test("required routes have a heading and no page-level horizontal overflow", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${route} overflows at ${viewport.width}px`).toBeLessThanOrEqual(1);
    }
  }
});

test("the shell shows the member the synthetic state describes", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner").getByText("Aarav Sharma")).toBeVisible();
  await expect(page.getByText("Aarav Mehta")).toHaveCount(0);
});

test("home describes each blocker distinctly and links to the passbook", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Recent activity" })).toBeVisible();

  const titles = await page.locator(".activity-entry strong").allInnerTexts();
  expect(titles.length).toBeGreaterThan(1);
  expect(new Set(titles).size, "activity rows must not repeat one label").toBe(titles.length);
  expect(titles).toContain("Date of Exit issue detected");
  expect(titles).toContain("Legacy employment record issue detected");

  // The contribution preview reads from the deterministic passbook, seeded anomaly included.
  await expect(page.locator(".mini-ledger__row")).toHaveCount(4);
  await expect(page.getByRole("link", { name: "View passbook" })).toBeVisible();
  await page.getByRole("link", { name: "View passbook" }).click();
  await expect(page).toHaveURL(/\/passbook$/);
});

test("passbook renders the ledger, the March anomaly, and the May reconciliation", async ({ page }) => {
  await page.goto("/passbook");
  await expect(page.getByRole("heading", { name: "Passbook", level: 1 })).toBeVisible();

  const rows = page.locator(".ledger-table tbody tr");
  await expect(rows).toHaveCount(7);
  await expect(page.getByRole("rowheader", { name: "Mar 2026" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Jul 2026" })).toBeVisible();

  // The wage-derived figures come from the contribution health engine, not the page.
  const march = rows.filter({ hasText: "Mar 2026" });
  await expect(march).toHaveClass(/ledger-row--attention/);
  await expect(march.getByText("Needs attention")).toBeVisible();
  await expect(rows.filter({ hasText: "May 2026" }).getByText("Reconciled")).toBeVisible();
  await expect(rows.filter({ hasText: "Jun 2026" }).getByText("Delayed")).toBeVisible();

  // March opens by default because it is the newest month needing attention.
  const panel = page.locator(".explain-panel");
  await expect(panel.getByRole("heading", { name: "March 2026" })).toBeVisible();
  await expect(panel.getByText("Expected employer EPF", { exact: true })).toBeVisible();
  await expect(panel.getByText("₹2,160", { exact: true }).first()).toBeVisible();

  await page.getByRole("link", { name: "Understand this contribution" }).nth(1).click();
  await expect(page).toHaveURL(/month=2026-05/);
  await expect(panel.getByRole("heading", { name: "May 2026" })).toBeVisible();
  await expect(panel.getByText("Correction trace", { exact: true })).toBeVisible();
  await expect(panel.getByText("Originally filed", { exact: true })).toBeVisible();
  await expect(panel.getByText("Final posted employer EPF", { exact: true })).toBeVisible();
});

test("passbook filters narrow the ledger through the URL", async ({ page }) => {
  await page.goto("/passbook");
  await page.getByLabel("Status").selectOption("attention");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/status=attention/);
  await expect(page.locator(".ledger-table tbody tr")).toHaveCount(2);
  await expect(page.getByRole("rowheader", { name: "Mar 2026" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Jun 2026" })).toBeVisible();
});

test("member resolves both blockers, employer approves, and the claim is submitted", async ({ page }) => {
  await page.goto("/withdraw/preflight");
  await expect(page.getByRole("heading", { name: "Final settlement readiness" })).toBeVisible();
  await expect(page.locator(".check-line")).toHaveCount(7);
  await expect(page.locator(".map-node")).toHaveCount(7);
  await expect(page.getByText("5 of 7 checks complete").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to claim" })).toHaveAttribute("aria-disabled", "true");

  await page.locator(".action-item").first().getByRole("link", { name: "Resolve this check" }).click();
  await page.getByRole("link", { name: "Open Mark Exit" }).click();
  await page.getByRole("button", { name: "Review proposed Date of Exit" }).click();
  await expect(page.getByRole("button", { name: "Confirm synthetic Date of Exit" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm synthetic Date of Exit" }).click();

  await page.goto("/withdraw/preflight");
  await expect(page.getByText("6 of 7 checks complete").first()).toBeVisible();

  await page.locator(".action-item").getByRole("link", { name: "Resolve this check" }).click();
  await page.getByRole("button", { name: "Send synthetic request" }).click();
  await page.getByRole("link", { name: "View shared request" }).click();
  await expect(page.getByText("Current and proposed details")).toBeVisible();
  await page.getByRole("button", { name: "Start review" }).click();
  await expect(page.getByRole("button", { name: "Approve change" })).toBeVisible();
  await page.getByRole("button", { name: "Approve change" }).click();
  await expect(page.getByText("Approved and applied")).toBeVisible();

  await page.goto("/withdraw/preflight");
  await expect(page.getByText("7 of 7 checks complete").first()).toBeVisible();
  await page.getByRole("link", { name: "Continue to claim" }).click();
  await expect(page.getByRole("heading", { name: "Review your synthetic claim" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm and submit synthetic claim" }).click();
  await expect(page.getByRole("heading", { name: /final PF settlement/ })).toBeVisible();
  await expect(page.getByText("Submitted", { exact: true }).first()).toBeVisible();
});
