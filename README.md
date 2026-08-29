# EPFO One

EPFO One is an independent hackathon prototype that joins a synthetic member portal and employer portal around shared PF records, deterministic resolution routing, and one complete final-settlement journey.

> Independent hackathon prototype · Synthetic data only

No screen connects to EPFO, government APIs, employers, Aadhaar, PAN services, banks, OTP services, or any other external system. Never enter real credentials or account details.

## What is included

- Member architecture: Home, View, Manage, and Online Services
- One masked synthetic UAN with three employment member records
- Goal-first final PF settlement mapped internally to Form 19
- Claim Preflight with exactly seven deterministic checks
- Readiness from raw pass count: 5/7 = 71%, 6/7 = 86%, and 7/7 = 100%
- Deterministic Resolution Router: `SELF_SERVICE`, `EMPLOYER_ACTION`, `EPFO_ACTION`, or `AUTO_RESOLUTION`
- Member self-service Mark Exit after the synthetic waiting-period conditions pass
- Employer request inbox and detail view with current and proposed values
- Employer approve, request-information, and reject decisions, including required member-visible reasons
- Shared state: employer approval updates the underlying member record and automatically reruns preflight
- Guarded issue, employer-request, claim, and payment state machines
- Explicit claim confirmation and a detailed timeline through simulated bank credit
- Typed in-memory repository with Zod runtime validation and audit events

Experience V2 deterministic foundation:

- Passbook contribution ledger with a `POSTED` / `DELAYED` / `MISMATCH` / `MISSING` / `RECONCILED` health engine
- Form 31 advance policy for medical, marriage, education, and housing purposes
- Form 13 transfer state machine across eight guarded states, each emitting an audit event
- Employer ECR payroll parser, five-code validation engine, and a `DRAFT` to `PAID` state machine
- A completed employer ECR payment posts the member's contribution and moves the shared PF balance
- Eighty-six deterministic domain tests

## Routes

Member routes:

- `/` Member Home
- `/member` Employment and PF history
- `/manage` Profile and PF record management
- `/manage/mark-exit` Member self-service Date of Exit
- `/online-services` Goal-first service selection
- `/withdraw`, `/withdraw/preflight`, `/withdraw/review`
- `/issues/[issueId]` Deterministic resolution guidance
- `/claims/[claimId]` Claim and payment timeline

Employer routes:

- `/employer` Synthetic employer home
- `/employer/requests` Request inbox
- `/employer/requests/[requestId]` Request comparison, context, decision, and history

Command and read routes:

- `POST /api/actions/advance` Form 31 goal selection, submission, and processing states
- `POST /api/actions/transfer` Form 13 blocker resolution and state progression
- `POST /api/employer/ecr/[ecrId]` ECR validation, row correction, challan, and payment
- `GET /api/experience` Experience V2 read model, including the derived passbook summary
- `GET /api/state` Full synthetic application state

The `/demo` route can reset the scenario and advance the post-submission processing states. Record corrections themselves only occur through the member and employer product flows.

## Architecture

```text
src/
  domain/          Schemas, preflight, routing, readiness, state machines, timeline
                   Contribution health, advance policy, transfer, and ECR engines
  fixtures/        Aarav Sharma and Demo Systems synthetic scenario
  repositories/    Repository contract, in-memory implementation, singleton
  adapters/        Member self-service, employer workflow, claim processor
  application/     Use cases that coordinate domain logic and persistence
  app/api/         Zod-validated command routes
  app/             Next.js App Router member and employer screens
  components/      Reusable presentation and client action controls
```

React components do not decide routing, readiness, eligibility, workflow transitions, or monetary values. All mutations pass through application APIs and persist through the repository contract.

The repository is intentionally process-local. Restarting the server resets the synthetic scenario, and the reset control on `/demo` does the same explicitly.

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

To run the optimized production build:

```bash
npm run build
npm start
```
