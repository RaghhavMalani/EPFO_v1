import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/member",
  "/manage",
  "/online-services",
  "/withdraw",
  "/withdraw/preflight",
  "/employer",
  "/employer/requests",
];

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/demo", { data: { action: "RESET" } });
  expect(response.ok()).toBeTruthy();
});

test("required routes have a heading and no page-level horizontal overflow", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 780 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${route} overflows at ${viewport.width}px`).toBeLessThanOrEqual(1);
    }
  }
});

test("member resolves both blockers, employer approves, and the claim is submitted", async ({ page }) => {
  await page.goto("/withdraw/preflight");
  await expect(page.getByRole("heading", { name: "Final PF settlement" })).toBeVisible();
  await expect(page.locator(".preflight-row")).toHaveCount(7);
  await expect(page.getByText("5 of 7 checks passed").first()).toBeVisible();

  await page.locator(".preflight-row--blocked").first().getByRole("link", { name: "Resolve issue" }).click();
  await page.getByRole("link", { name: "Open Mark Exit" }).click();
  await page.getByRole("button", { name: "Review proposed Date of Exit" }).click();
  await expect(page.getByRole("button", { name: "Confirm synthetic Date of Exit" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm synthetic Date of Exit" }).click();
  await expect(page.getByText("6 of 7 checks passed").first()).toBeVisible();

  await page.locator(".preflight-row--blocked").getByRole("link", { name: "Resolve issue" }).click();
  await page.getByRole("button", { name: "Send synthetic request" }).click();
  await page.getByRole("link", { name: "View shared request" }).click();
  await expect(page.getByText("Current and proposed details")).toBeVisible();
  await page.getByRole("button", { name: "Start review" }).click();
  await expect(page.getByRole("button", { name: "Approve change" })).toBeVisible();
  await page.getByRole("button", { name: "Approve change" }).click();
  await expect(page.getByText("Approved and applied")).toBeVisible();

  await page.goto("/withdraw/preflight");
  await expect(page.getByText("7 of 7 checks passed").first()).toBeVisible();
  await page.getByRole("link", { name: "Continue to claim" }).click();
  await expect(page.getByRole("heading", { name: "Review your synthetic claim" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm and submit synthetic claim" }).click();
  await expect(page.getByRole("heading", { name: /final PF settlement/ })).toBeVisible();
  await expect(page.getByText("Submitted", { exact: true }).first()).toBeVisible();
});
