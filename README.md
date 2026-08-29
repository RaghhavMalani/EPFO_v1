# EPFO One

EPFO One is an independent hackathon prototype that joins a synthetic member portal and employer portal around shared PF records, deterministic resolution routing, and complete final-settlement, advance, transfer, and payroll journeys.

> Independent hackathon prototype · Synthetic data only

No screen connects to EPFO, government APIs, employers, Aadhaar, PAN services, banks, OTP services, or any other external system. Never enter real credentials or account details.

## Sign in

- `/login` — two demo identities, either signed in with the password `demo1234` (or the "Use demo credentials" button):
  - **Member:** Aarav Sharma · UAN `100200304821`
  - **Employer:** Demo Systems Pvt Ltd · Establishment ID `DL-DEM-2712`
- Mock cookie-based auth only — there is no real session or credential store. Member and employer routes redirect to `/login` without the right role cookie; a masthead **Sign out** control clears it.
- `/demo`, linked quietly from the footer as **Demo controls**, resets the shared in-memory scenario and advances post-submission processing states. State is shared across all visitors; judges can reset it at any time.

## What is included

- Member architecture: Home, View, Manage, Online Services, Passbook, Claim Centre, Advance, Transfer, Pension, and Activity
- One masked synthetic UAN with four employment member records
- Goal-first final PF settlement mapped internally to Form 19, plus a goal-based Form 31 advance and a Form 13 transfer
- Claim Preflight with exactly seven deterministic checks
- Readiness from raw pass count: 5/7 = 71%, 6/7 = 86%, and 7/7 = 100%
- Deterministic Resolution Router: `SELF_SERVICE`, `EMPLOYER_ACTION`, `EPFO_ACTION`, or `AUTO_RESOLUTION`
- Member self-service Mark Exit after the synthetic waiting-period conditions pass
- Employer request inbox and detail view with current and proposed values
- Employer approve, request-information, and reject decisions, including required member-visible reasons
- Shared state: employer approval updates the underlying member record and automatically reruns preflight
- Guarded issue, employer-request, claim, advance, transfer, and ECR state machines
- Explicit claim confirmation and a detailed timeline through simulated bank credit
- Typed in-memory repository with Zod runtime validation and audit events, shared correctly across every Route Handler and page in both `next dev` and a production `next start`

Experience V2 and flagship additions:

- Passbook contribution ledger with a `POSTED` / `DELAYED` / `MISMATCH` / `MISSING` / `RECONCILED` health engine, a hand-rolled SVG contribution chart, and a "Where does my money go?" statutory 12% / 3.67% / 8.33% contribution-split explainer per selected month
- Form 31 advance: goal picker across medical, marriage, education, and housing purposes, the deterministic eligibility calculation shown with its inputs, review, submission, and processing states
- Form 13 transfer: a previous-to-current employer consolidation visual and an eight-state guarded machine, with blocker resolution
- `/claims`: a claim centre combining the active claim's progression with a settled-claims ledger
- Employer ECR: payroll parsing, a five-code validation engine, row-level correction (or exclusion for duplicates), challan generation, and a `DRAFT` to `PAID` payment machine
- A completed employer ECR payment posts the member's contribution and moves the shared PF balance — shown explicitly on both sides of the cross-role payoff
- `/pension`: a synthetic EPS pension estimate (public formula shape) and a retirement corpus projection compounding to age 58, rendered with a hand-rolled SVG area/line chart
- e-Nomination at `/manage/nomination`, with a profile completeness meter on `/manage`
- Hindi/English toggle across navigation and the full member journey's headline and label strings, persisted in `localStorage`
- `/activity`: a full-page view of the deterministic event timeline
- A print stylesheet and browser-native "Download statement" on `/passbook`
- Over 110 deterministic domain tests

## Routes

Front door:

- `/login` Mock sign-in for the member and employer demo identities

Member routes:

- `/` Member Home
- `/member` Employment and PF history
- `/manage` Profile and PF record management, with a profile completeness meter
- `/manage/mark-exit` Member self-service Date of Exit
- `/manage/nomination` e-Nomination
- `/online-services` Goal-first service selection
- `/withdraw`, `/withdraw/preflight`, `/withdraw/review` Form 19 final settlement
- `/advance` Form 31 partial withdrawal
- `/transfer` Form 13 account transfer
- `/claims`, `/claims/[claimId]` Claim centre and claim timeline
- `/issues/[issueId]` Deterministic resolution guidance
- `/passbook` Contribution ledger, health engine, and split explainer
- `/pension` EPS pension estimate and retirement corpus projection
- `/activity` Full account activity timeline

Employer routes:

- `/employer` Employer operations overview: queue, ECR status, member impact, recent decisions
- `/employer/requests`, `/employer/requests/[requestId]` Request inbox and decision
- `/employer/ecr`, `/employer/ecr/[ecrId]` Payroll validation, correction, challan, and payment

Command and read routes:

- `POST /api/auth/login`, `POST /api/auth/logout` Mock sign-in and sign-out
- `POST /api/actions/preflight`, `POST /api/actions/claim`, `POST /api/actions/issues/[issueId]` Member self-service and claim actions
- `POST /api/actions/advance` Form 31 goal selection, submission, and processing states
- `POST /api/actions/transfer` Form 13 blocker resolution and state progression
- `POST /api/actions/nomination` e-Nomination save
- `POST /api/employer/requests/[requestId]` Employer decisions
- `POST /api/employer/ecr/[ecrId]` ECR validation, row correction, challan, and payment
- `GET /api/experience` Experience V2 read model, including the derived passbook summary
- `GET /api/state` Full synthetic application state

The `/demo` route can reset the scenario and advance the post-submission processing states. Record corrections themselves only occur through the member and employer product flows.

## Architecture

```text
src/
  domain/          Schemas, preflight, routing, readiness, state machines, timeline
                   Contribution health and split, advance policy, transfer, ECR, pension, nomination
  fixtures/        Aarav Sharma and Demo Systems synthetic scenario
  repositories/    Repository contract, in-memory implementation, singleton
  adapters/        Member self-service, employer workflow, claim processor
  application/     Use cases that coordinate domain logic and persistence
  lib/i18n/        Client-side Hindi/English dictionary, context, and toggle
  app/api/         Zod-validated command routes
  app/             Next.js App Router member and employer screens
  proxy.ts         Next.js 16 route gating on the mock role cookie
  components/      Reusable presentation and client action controls
```

React components do not decide routing, readiness, eligibility, workflow transitions, or monetary values. All mutations pass through application APIs and persist through the repository contract.

The repository is intentionally process-local: it is published on `globalThis` so every Route Handler and Server Component in the process shares one instance, in both `next dev` and a production `next start`. Restarting the server resets the synthetic scenario, and the reset control on `/demo` does the same explicitly.

Policy-inspired assumptions and primary public references are recorded in [`docs/POLICY_SOURCES.md`](docs/POLICY_SOURCES.md).

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validate

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

To run the optimized production build (honours the `PORT` environment variable, as Railway and similar platforms inject):

```bash
npm run build
npm start
```

To run the Playwright end-to-end happy path (requires a browser install; skips gracefully if the environment cannot install one):

```bash
npm run test:e2e
```
