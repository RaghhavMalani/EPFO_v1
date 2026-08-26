# EPFO One

EPFO One is an independent hackathon prototype that redesigns a synthetic PF withdrawal journey around a citizen goal instead of forms.

> Independent prototype · Synthetic data

No screen connects to EPFO, government APIs, employers, Aadhaar, PAN services, banks, OTP services, or any other external system. Do not enter real credentials or account details.

## What is included

- Goal-first home page and synthetic member overview
- Deterministic Claim Preflight with seven checks
- Readiness derived as 72%, 86%, and 100% from weighted checks
- Mock Date of Exit correction and old-balance reconciliation workflows
- Guarded issue and claim state machines
- Explicit mock claim confirmation
- Detailed claim and payment timeline through simulated credit
- Internal demo control panel
- Typed in-memory repository with Zod runtime validation
- Audit events for issue, employment, claim, and payment changes
- Vitest coverage for the ten requested domain behaviors

## Architecture

```text
src/
  domain/          Pure schemas, rules, readiness, state machines, timeline copy
  fixtures/        The Aarav Sharma synthetic scenario
  repositories/    Repository contract, in-memory implementation, singleton
  adapters/        Mock employer, transfer, claim processor, and bank behavior
  application/     Use cases that coordinate domain logic and persistence
  app/api/         Zod-validated HTTP command routes
  app/             Next.js App Router screens
  components/      Reusable presentation and client action controls
```

React components do not decide readiness, eligibility, issue transitions, claim transitions, or monetary values. All mutations pass through application APIs and persist through the repository contract.

The repository is intentionally process-local. Restarting the server resets the synthetic scenario, and the reset control on `/demo` does the same explicitly.

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
