import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";

test.setTimeout(120_000);

const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? [], "browser console and page errors").toEqual([]);
});

type SubmissionState = {
  member: {
    currentPfBalancePaise: number;
    employments: Array<{
      id: string;
      pfRecordExitDate: string | null;
      employmentEnd: string;
      pfBalancePaise: number;
      legacyRecordStatus: string;
    }>;
  };
  issues: Array<{ id: string; type: string; status: string }>;
  employerRequests: Array<{ id: string; issueId: string | null; status: string }>;
  claim: { id: string; state: string };
  readiness: { passedCount: number; totalChecks: number; isReady: boolean };
  auditEvents: Array<{ eventType: string; aggregateId: string }>;
  experience: {
    advance: { goal: string; state: string; eligible: boolean; checks: Array<{ status: string }> };
    transfer: { state: string; previousEmploymentId: string; currentEmploymentId: string; amountPaise: number };
    ecrs: Array<{ id: string; state: string; rows: Array<{ id: string; status: string }> }>;
    contributions: Array<{
      month: string;
      postingStatus: string;
      sourceEcrId: string | null;
      employeeContributionPaise: number;
      employerEpfContributionPaise: number;
    }>;
  };
};

async function sessionCookie(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "epfo-one-session");
}

async function assertSessionCookie(page: Page) {
  const cookie = await sessionCookie(page);
  expect(cookie, "the browser must retain the demo session cookie").toBeDefined();
  expect(cookie?.path).toBe("/");
  expect(cookie?.httpOnly).toBe(true);
}

async function state(page: Page): Promise<SubmissionState> {
  const response = await page.request.get("/api/state", {
    headers: { "Cache-Control": "no-cache" },
  });
  const body = await response.text();
  expect(response.ok(), `GET /api/state -> ${response.status()} ${body}`).toBeTruthy();
  return JSON.parse(body) as SubmissionState;
}

async function postApi(page: Page, endpoint: string, body: Record<string, unknown>) {
  await assertSessionCookie(page);
  const response = await page.request.post(endpoint, { data: body });
  const responseBody = await response.text();
  expect(
    response.ok(),
    `POST ${endpoint} -> ${response.status()} ${responseBody}`,
  ).toBeTruthy();
  return responseBody;
}

async function clickMutation(page: Page, target: Locator, endpoint: RegExp) {
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === "POST" && endpoint.test(url.pathname);
  });
  await target.click();
  const response = await responsePromise;
  const requestHeaders = await response.request().allHeaders();
  expect(
    requestHeaders.cookie ?? "",
    `POST ${new URL(response.url()).pathname} did not include epfo-one-session`,
  ).toContain("epfo-one-session=");
  if (!response.ok()) {
    const responseBody = await response.text();
    expect(
      response.ok(),
      `POST ${new URL(response.url()).pathname} -> ${response.status()} ${responseBody}`,
    ).toBeTruthy();
  }
}

async function resetFreshSession(page: Page) {
  await page.goto("/login");
  await assertSessionCookie(page);
  await postApi(page, "/api/demo", { action: "RESET" });
  const clean = await state(page);
  expect(clean.readiness.passedCount).toBe(5);
  expect(clean.claim.state).toBe("DRAFT");
}

async function loginViaUi(page: Page, role: "member" | "employer") {
  await page.goto("/login");
  const card = page.locator(`form[aria-labelledby="login-card-${role}-name"]`);
  await card.getByRole("button", { name: "Use demo credentials" }).click();
  await clickMutation(
    page,
    card.getByRole("button", { name: new RegExp(`Sign in as ${role}`) }),
    /^\/api\/auth\/login$/,
  );
  await page.waitForURL(role === "member" ? "/" : "/employer");
}

async function signOutViaUi(page: Page) {
  await clickMutation(page, page.getByRole("button", { name: "Sign out" }), /^\/api\/auth\/logout$/);
  await page.waitForURL("/login");
}

async function markExitViaUi(page: Page) {
  await page.goto("/manage/mark-exit");
  await clickMutation(
    page,
    page.getByRole("button", { name: "Review proposed Date of Exit" }),
    /^\/api\/actions\/issues\/issue-exit-date$/,
  );
  await expect(page.getByRole("button", { name: "Confirm synthetic Date of Exit" })).toBeVisible();
  await clickMutation(
    page,
    page.getByRole("button", { name: "Confirm synthetic Date of Exit" }),
    /^\/api\/actions\/issues\/issue-exit-date$/,
  );
  await page.waitForURL("/withdraw/preflight");
}

async function createEmployerCorrectionViaUi(page: Page) {
  await page.goto("/issues/issue-legacy-record");
  await clickMutation(
    page,
    page.getByRole("button", { name: "Send synthetic request" }),
    /^\/api\/actions\/issues\/issue-legacy-record$/,
  );
  const snapshot = await state(page);
  const request = snapshot.employerRequests.find((item) => item.issueId === "issue-legacy-record");
  expect(request, "member correction request must exist in domain state").toBeDefined();
  return request!;
}

async function approveEmployerCorrectionViaUi(page: Page, requestId: string) {
  await page.goto(`/employer/requests/${requestId}`);
  await clickMutation(
    page,
    page.getByRole("button", { name: "Start review" }),
    new RegExp(`^/api/employer/requests/${requestId}$`),
  );
  await expect(page.getByRole("button", { name: "Approve change" })).toBeVisible();
  await clickMutation(
    page,
    page.getByRole("button", { name: "Approve change" }),
    new RegExp(`^/api/employer/requests/${requestId}$`),
  );
  await expect(page.getByText("Approved and applied")).toBeVisible();
}

async function makeForm19ReadyViaApi(page: Page) {
  await postApi(page, "/api/actions/issues/issue-exit-date", { action: "START_MARK_EXIT" });
  await postApi(page, "/api/actions/issues/issue-exit-date", { action: "COMPLETE_MARK_EXIT" });
  await postApi(page, "/api/actions/issues/issue-legacy-record", {
    action: "CREATE_EMPLOYER_REQUEST",
  });
  const requested = await state(page);
  const request = requested.employerRequests.find((item) => item.issueId === "issue-legacy-record");
  expect(request).toBeDefined();
  await postApi(page, `/api/employer/requests/${request!.id}`, { action: "START_REVIEW" });
  await postApi(page, `/api/employer/requests/${request!.id}`, { action: "APPROVE" });
  const ready = await state(page);
  expect(ready.readiness.passedCount).toBe(7);
  expect(ready.claim.state).toBe("READY");
}

async function enabledRunButton(page: Page) {
  const buttons = page.getByRole("button", { name: "Run", exact: true });
  await expect(buttons).toHaveCount(6);
  for (let index = 0; index < (await buttons.count()); index += 1) {
    const button = buttons.nth(index);
    if (await button.isEnabled()) return button;
  }
  throw new Error("No enabled demo processing action was found.");
}

async function advanceForm19ToCreditViaUi(page: Page) {
  const expectedStates = [
    "ELIGIBILITY_VERIFIED",
    "RECORDS_VERIFIED",
    "APPROVED",
    "PAYMENT_INSTRUCTION_CREATED",
    "BANK_PROCESSING",
    "CREDITED",
  ];
  await page.goto("/demo");
  for (const expectedState of expectedStates) {
    await clickMutation(page, await enabledRunButton(page), /^\/api\/demo$/);
    await expect.poll(async () => (await state(page)).claim.state).toBe(expectedState);
  }
}

async function correctEcrViaUi(page: Page) {
  await page.goto("/employer/ecr");
  await page.waitForURL(/\/employer\/ecr\/ecr-2026-08/);
  await clickMutation(
    page,
    page.getByRole("button", { name: "Re-run validation" }),
    /^\/api\/employer\/ecr\/ecr-2026-08$/,
  );
  expect((await state(page)).experience.ecrs[0].state).toBe("VALIDATION_FAILED");

  const correctionRows = ["Meera Shah", "Aarav Sharma"];
  for (const employee of correctionRows) {
    const row = page.locator(".ecr-row", { hasText: employee });
    await clickMutation(
      page,
      row.getByRole("button", { name: "Save correction" }),
      /^\/api\/employer\/ecr\/ecr-2026-08$/,
    );
    await expect(page.locator(".ecr-row", { hasText: employee })).toHaveCount(0);
  }

  const duplicate = page.locator(".ecr-row", { hasText: "Kabir Rao" });
  await clickMutation(
    page,
    duplicate.getByRole("button", { name: "Exclude duplicate row" }),
    /^\/api\/employer\/ecr\/ecr-2026-08$/,
  );
  await expect(page.locator(".ecr-row", { hasText: "Kabir Rao" })).toHaveCount(0);

  const missingUan = page.locator(".ecr-row", { hasText: "Dev Patel" });
  await missingUan.getByLabel("Masked UAN").fill("DEMO-••••-9001");
  await clickMutation(
    page,
    missingUan.getByRole("button", { name: "Save correction" }),
    /^\/api\/employer\/ecr\/ecr-2026-08$/,
  );
  await expect(page.locator(".ecr-row", { hasText: "Dev Patel" })).toHaveCount(0);

  const missingWage = page.locator(".ecr-row", { hasText: "Nikhil Bose" });
  await missingWage.getByLabel("Wage basis (₹)").fill("18000");
  await clickMutation(
    page,
    missingWage.getByRole("button", { name: "Save correction" }),
    /^\/api\/employer\/ecr\/ecr-2026-08$/,
  );
  await expect(page.locator(".ecr-row", { hasText: "Nikhil Bose" })).toHaveCount(0);

  await expect(page.getByText("No rows need review. Every payroll row is ready to file.")).toBeVisible();
  expect((await state(page)).experience.ecrs[0].state).toBe("READY");
}

async function payEcrViaUi(page: Page) {
  const actions = [
    ["Generate challan", "CHALLAN_GENERATED"],
    ["Start payment", "PAYMENT_PROCESSING"],
    ["Confirm payment", "PAID"],
  ] as const;
  for (const [label, expectedState] of actions) {
    await clickMutation(
      page,
      page.getByRole("button", { name: label }),
      /^\/api\/employer\/ecr\/ecr-2026-08$/,
    );
    await expect.poll(async () => (await state(page)).experience.ecrs[0].state).toBe(expectedState);
  }
}

test("1. Mark Date of Exit changes the record, readiness, and persisted state", async ({ page }) => {
  await resetFreshSession(page);
  await loginViaUi(page, "member");
  const before = await state(page);
  const employmentBefore = before.member.employments.find((item) => item.id === "employment-demo-systems")!;
  expect(employmentBefore.pfRecordExitDate).toBeNull();
  expect(before.readiness.passedCount).toBe(5);

  await markExitViaUi(page);
  const after = await state(page);
  const employmentAfter = after.member.employments.find((item) => item.id === "employment-demo-systems")!;
  expect(employmentAfter.pfRecordExitDate).toBe(employmentAfter.employmentEnd);
  expect(after.issues.find((item) => item.id === "issue-exit-date")?.status).toBe("RESOLVED");
  expect(after.readiness.passedCount).toBe(6);
  await expect(page.getByText("6 of 7 checks complete").first()).toBeVisible();

  await page.reload();
  await expect(page.getByText("6 of 7 checks complete").first()).toBeVisible();
  expect((await state(page)).member.employments.find((item) => item.id === "employment-demo-systems")?.pfRecordExitDate).toBe(employmentAfter.employmentEnd);
});

test("2. Employer correction approval produces 7/7 and persists", async ({ page }) => {
  await resetFreshSession(page);
  await loginViaUi(page, "member");
  await markExitViaUi(page);
  const request = await createEmployerCorrectionViaUi(page);

  await signOutViaUi(page);
  await loginViaUi(page, "employer");
  await approveEmployerCorrectionViaUi(page, request.id);
  const approved = await state(page);
  expect(approved.employerRequests.find((item) => item.id === request.id)?.status).toBe("APPROVED");
  expect(approved.member.employments.find((item) => item.id === "employment-demo-systems")?.legacyRecordStatus).toBe("ALIGNED");
  expect(approved.readiness.passedCount).toBe(7);
  expect(approved.claim.state).toBe("READY");

  await signOutViaUi(page);
  await loginViaUi(page, "member");
  await page.goto("/withdraw/preflight");
  await expect(page.getByText("7 of 7 checks complete").first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("7 of 7 checks complete").first()).toBeVisible();
  expect((await state(page)).readiness.passedCount).toBe(7);
});

test("3. Form 19 submits, advances to credited, and persists", async ({ page }) => {
  await resetFreshSession(page);
  await loginViaUi(page, "member");
  await makeForm19ReadyViaApi(page);

  await page.goto("/withdraw/review");
  await expect(page.getByRole("heading", { name: "Review your synthetic claim" })).toBeVisible();
  await clickMutation(
    page,
    page.getByRole("button", { name: "Confirm and submit synthetic claim" }),
    /^\/api\/actions\/claim$/,
  );
  await page.waitForURL(/\/claims\/claim-demo-001/);
  expect((await state(page)).claim.state).toBe("SUBMITTED");

  await advanceForm19ToCreditViaUi(page);
  expect((await state(page)).claim.state).toBe("CREDITED");
  await page.reload();
  expect((await state(page)).claim.state).toBe("CREDITED");
});

test("4. Form 31 medical advance reaches credited and persists", async ({ page }) => {
  await resetFreshSession(page);
  await loginViaUi(page, "member");
  const initialBalance = (await state(page)).member.currentPfBalancePaise;
  await page.goto("/advance");
  await clickMutation(
    page,
    page.getByRole("radio", { name: /Medical treatment/ }),
    /^\/api\/actions\/advance$/,
  );
  const eligible = await state(page);
  expect(eligible.experience.advance.goal).toBe("MEDICAL");
  expect(eligible.experience.advance.eligible).toBe(true);
  expect(eligible.experience.advance.checks.every((check) => check.status === "PASS")).toBe(true);

  await clickMutation(
    page,
    page.getByRole("button", { name: "Submit advance request" }),
    /^\/api\/actions\/advance$/,
  );
  expect((await state(page)).experience.advance.state).toBe("SUBMITTED");
  await clickMutation(
    page,
    page.getByRole("button", { name: "Advance to EPFO processing" }),
    /^\/api\/actions\/advance$/,
  );
  expect((await state(page)).experience.advance.state).toBe("EPFO_PROCESSING");
  await clickMutation(
    page,
    page.getByRole("button", { name: "Advance to bank credit" }),
    /^\/api\/actions\/advance$/,
  );
  const credited = await state(page);
  expect(credited.experience.advance.state).toBe("CREDITED");
  expect(credited.member.currentPfBalancePaise).toBeLessThan(initialBalance);
  await page.reload();
  expect((await state(page)).experience.advance.state).toBe("CREDITED");
});

test("5. Form 13 completes, moves the source balance, and persists", async ({ page }) => {
  await resetFreshSession(page);
  await loginViaUi(page, "member");
  const initial = await state(page);
  const transfer = initial.experience.transfer;
  const sourceBefore = initial.member.employments.find((item) => item.id === transfer.previousEmploymentId)!;
  const targetBefore = initial.member.employments.find((item) => item.id === transfer.currentEmploymentId)!;
  await page.goto("/transfer");

  await clickMutation(
    page,
    page.getByRole("button", { name: "Request employer correction" }),
    /^\/api\/actions\/transfer$/,
  );
  expect((await state(page)).experience.transfer.state).toBe("READY");
  await clickMutation(
    page,
    page.getByRole("button", { name: "Submit transfer request" }),
    /^\/api\/actions\/transfer$/,
  );
  expect((await state(page)).experience.transfer.state).toBe("SUBMITTED");

  const remainingStates = [
    "PREVIOUS_RECORD_VERIFIED",
    "CURRENT_RECORD_VERIFIED",
    "EPFO_PROCESSING",
    "BALANCE_MOVED",
    "COMPLETED",
  ];
  for (const expectedState of remainingStates) {
    await clickMutation(
      page,
      page.getByRole("button", { name: "Advance to next stage" }),
      /^\/api\/actions\/transfer$/,
    );
    await expect.poll(async () => (await state(page)).experience.transfer.state).toBe(expectedState);
  }

  const completed = await state(page);
  const sourceAfter = completed.member.employments.find((item) => item.id === transfer.previousEmploymentId)!;
  const targetAfter = completed.member.employments.find((item) => item.id === transfer.currentEmploymentId)!;
  expect(completed.experience.transfer.state).toBe("COMPLETED");
  expect(sourceAfter.pfBalancePaise).toBe(0);
  expect(targetAfter.pfBalancePaise).toBe(targetBefore.pfBalancePaise + sourceBefore.pfBalancePaise);
  await page.reload();
  expect((await state(page)).experience.transfer.state).toBe("COMPLETED");
});

test("6. ECR payment posts the member contribution and persists", async ({ page }) => {
  await resetFreshSession(page);
  await loginViaUi(page, "employer");
  const initialBalance = (await state(page)).member.currentPfBalancePaise;
  await correctEcrViaUi(page);
  await payEcrViaUi(page);

  const paid = await state(page);
  const contribution = paid.experience.contributions.find((item) => item.sourceEcrId === "ecr-2026-08");
  expect(paid.experience.ecrs[0].state).toBe("PAID");
  expect(paid.auditEvents.some((event) => event.eventType === "CONTRIBUTION_POSTED")).toBe(true);
  expect(contribution?.postingStatus).toBe("POSTED");
  expect(paid.member.currentPfBalancePaise).toBe(
    initialBalance + contribution!.employeeContributionPaise + contribution!.employerEpfContributionPaise,
  );

  await signOutViaUi(page);
  await loginViaUi(page, "member");
  await page.goto("/passbook?month=2026-08");
  await expect(page.getByRole("rowheader", { name: "Aug 2026" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Aug 2026/ }).getByText("Posted", { exact: true })).toBeVisible();
  await page.reload();
  expect((await state(page)).experience.contributions.find((item) => item.sourceEcrId === "ecr-2026-08")?.postingStatus).toBe("POSTED");
});

async function prepareSecondSession(browser: Browser) {
  const context = await browser.newContext({ baseURL: "http://localhost:3000" });
  const page = await context.newPage();
  await resetFreshSession(page);
  await loginViaUi(page, "member");
  await postApi(page, "/api/actions/advance", {
    action: "SUBMIT",
    requestedAmountPaise: 4_000_000,
  });
  expect((await state(page)).experience.advance.state).toBe("SUBMITTED");
  return { context, page };
}

test("7. Demo reset clears only the current session and stale request ids", async ({ browser, page }) => {
  await resetFreshSession(page);
  await loginViaUi(page, "member");
  await makeForm19ReadyViaApi(page);
  const dirty = await state(page);
  const staleRequest = dirty.employerRequests.find((item) => item.issueId === "issue-legacy-record")!;
  const second = await prepareSecondSession(browser);

  await page.goto("/demo");
  await clickMutation(page, page.getByRole("button", { name: "Reset simulation" }), /^\/api\/demo$/);
  const clean = await state(page);
  expect(clean.readiness.passedCount).toBe(5);
  expect(clean.claim.state).toBe("DRAFT");
  expect(clean.employerRequests.some((item) => item.id === staleRequest.id)).toBe(false);
  expect(clean.member.employments.find((item) => item.id === "employment-demo-systems")?.pfRecordExitDate).toBeNull();
  await page.reload();
  expect((await state(page)).readiness.passedCount).toBe(5);

  expect((await state(second.page)).experience.advance.state).toBe("SUBMITTED");
  await second.context.close();
});

test("8. Judge Mode completes the scripted path with working Next and role switches", async ({ page }) => {
  await resetFreshSession(page);
  await page.goto("/login");
  await clickMutation(
    page,
    page.getByRole("button", { name: "Start the walkthrough" }),
    /^\/api\/tour$/,
  );
  await page.waitForURL("/passbook");
  await expect(page.getByRole("heading", { name: "A contribution that never arrived" })).toBeVisible();

  await clickMutation(page, page.getByRole("button", { name: "Next step" }), /^\/api\/tour$/);
  await page.waitForURL(/\/employer\/ecr/);
  await expect(page.getByRole("heading", { name: "Routed to who can actually fix it" })).toBeVisible();
  await correctEcrViaUi(page);
  await payEcrViaUi(page);

  await clickMutation(
    page,
    page.getByRole("button", { name: "The money moves" }),
    /^\/api\/tour$/,
  );
  await page.waitForURL("/passbook");
  await expect(page.getByRole("heading", { name: "The money moves" })).toBeVisible();
  await clickMutation(page, page.getByRole("button", { name: "Next step" }), /^\/api\/tour$/);
  await page.waitForURL("/withdraw");

  await clickMutation(
    page,
    page.getByRole("button", { name: "Run seven readiness checks" }),
    /^\/api\/actions\/preflight$/,
  );
  await page.waitForURL("/withdraw/preflight");
  await clickMutation(page, page.getByRole("button", { name: "Next step" }), /^\/api\/tour$/);
  await page.waitForURL("/withdraw/preflight");
  await markExitViaUi(page);
  const request = await createEmployerCorrectionViaUi(page);

  await page.getByRole("link", { name: "View shared request" }).click();
  await page.waitForURL(`/employer/requests/${request.id}`);
  await approveEmployerCorrectionViaUi(page, request.id);
  await clickMutation(
    page,
    page.getByRole("button", { name: "A claim that cannot fail" }),
    /^\/api\/tour$/,
  );
  await page.waitForURL("/withdraw/review");
  await clickMutation(
    page,
    page.getByRole("button", { name: "Confirm and submit synthetic claim" }),
    /^\/api\/actions\/claim$/,
  );
  await page.waitForURL(/\/claims\/claim-demo-001/);
  await advanceForm19ToCreditViaUi(page);
  await expect(page.getByRole("heading", { name: "That is the whole pattern" })).toBeVisible();
  expect((await state(page)).claim.state).toBe("CREDITED");
  await page.reload();
  expect((await state(page)).claim.state).toBe("CREDITED");
});
