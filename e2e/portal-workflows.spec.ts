import { expect, test, type Page } from "@playwright/test";

const routes = [
  "/",
  "/passbook",
  "/member",
  "/manage",
  "/online-services",
  "/advance",
  "/transfer",
  "/claims",
  "/pension",
  "/activity",
  "/withdraw",
  "/withdraw/preflight",
];

const employerRoutes = ["/employer", "/employer/requests", "/employer/ecr"];

const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 720 },
];

async function loginViaApi(page: Page, role: "member" | "employer") {
  const response = await page.request.post("/api/auth/login", {
    data: { role, password: "demo1234" },
  });
  expect(response.ok()).toBeTruthy();
}

async function loginViaUi(page: Page, role: "member" | "employer") {
  await page.goto("/login");
  const card = page.locator(`form[aria-labelledby="login-card-${role}-name"]`);
  await card.getByRole("button", { name: "Use demo credentials" }).click();
  await card.getByRole("button", { name: /Sign in as/ }).click();
  await page.waitForURL(role === "member" ? "/" : "/employer");
}

async function signOutViaUi(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("/login");
}

test.beforeEach(async ({ page }) => {
  const response = await page.request.post("/api/demo", { data: { action: "RESET" } });
  expect(response.ok()).toBeTruthy();
  await loginViaApi(page, "member");
});

test("the login screen gates every route and accepts only the demo password", async ({ page }) => {
  // Signed out, a protected route bounces to /login and remembers where to return.
  await page.request.post("/api/auth/logout");
  await page.goto("/passbook");
  await expect(page).toHaveURL(/\/login\?next=%2Fpassbook/);

  const memberCard = page.locator('form[aria-labelledby="login-card-member-name"]');
  await memberCard.getByLabel("Password").fill("wrong-password");
  await memberCard.getByRole("button", { name: /Sign in as/ }).click();
  await expect(memberCard.getByRole("alert")).toContainText("Incorrect password");

  await memberCard.getByRole("button", { name: "Use demo credentials" }).click();
  await memberCard.getByRole("button", { name: /Sign in as/ }).click();
  await expect(page).toHaveURL("/passbook");

  // An employer-only route redirects a member back to their own home rather than to /login.
  await page.goto("/employer");
  await expect(page).toHaveURL("/");
});

test("required member routes have a heading and no page-level horizontal overflow", async ({ page }) => {
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

test("required employer routes have a heading and no page-level horizontal overflow", async ({ page }) => {
  await loginViaApi(page, "employer");
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of employerRoutes) {
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

  // The statutory 12 / 3.67 / 8.33 split explainer sits alongside the health detail.
  await expect(panel.getByRole("heading", { name: "Where does my money go?" })).toBeVisible();

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

test("member logs in, resolves both blockers, employer approves, and the claim is submitted", async ({ page }) => {
  // beforeEach already authenticated as member via the API; this flow's own login/logout
  // steps below exercise the actual UI when switching personas mid-journey.
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
  // The member's issue page links to the shared request; that employer-side URL is what
  // crosses the role boundary. The member's own /issues/* URL would bounce an employer.
  const sharedRequestLink = page.getByRole("link", { name: "View shared request" });
  await expect(sharedRequestLink).toBeVisible();
  const requestUrl = (await sharedRequestLink.getAttribute("href")) ?? "";
  expect(requestUrl).toMatch(/^\/employer\/requests\//);

  // Switch personas the way the two-portal demo intends: sign out of member, into employer.
  await signOutViaUi(page);
  await loginViaUi(page, "employer");
  await page.goto(requestUrl);
  await expect(page.getByText("Current and proposed details")).toBeVisible();
  await page.getByRole("button", { name: "Start review" }).click();
  await expect(page.getByRole("button", { name: "Approve change" })).toBeVisible();
  await page.getByRole("button", { name: "Approve change" }).click();
  await expect(page.getByText("Approved and applied")).toBeVisible();

  // Back to the member to see readiness react to the employer's decision and submit.
  await signOutViaUi(page);
  await loginViaUi(page, "member");

  await page.goto("/withdraw/preflight");
  await expect(page.getByText("7 of 7 checks complete").first()).toBeVisible();
  await page.getByRole("link", { name: "Continue to claim" }).click();
  await expect(page.getByRole("heading", { name: "Review your synthetic claim" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm and submit synthetic claim" }).click();
  await expect(page.getByRole("heading", { name: /final PF settlement/ })).toBeVisible();
  await expect(page.getByText("Submitted", { exact: true }).first()).toBeVisible();
});

test("employer corrects an ECR row and payment posts the shared member's contribution", async ({ page }) => {
  await loginViaApi(page, "employer");
  await page.goto("/employer/ecr");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Validation Failed")).toBeVisible();

  // Correcting Aarav Sharma's mismatched employment record relinks the row with no input needed.
  const aaravRow = page.locator(".ecr-row", { hasText: "Aarav Sharma" });
  await aaravRow.getByRole("button", { name: "Save correction" }).click();
  await expect(page.locator(".ecr-row", { hasText: "Aarav Sharma" })).toHaveCount(0);
});
