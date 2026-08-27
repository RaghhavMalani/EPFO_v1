# EPFO One visual reset: final report

## Outcome

The generic SaaS dashboard language was replaced with a light, institutional, public-service interface. Domain behaviour was preserved. Member and employer roles now use related but visibly distinct shells and density levels.

## TasteSkill findings and influence

- The original interface relied on equal-weight rounded cards, large teal fills, decorative icons, oversized authenticated-page type, and generous spacing that weakened operational credibility.
- The redesign uses Swiss-rational hierarchy with low design variance, restrained motion, and higher information density.
- One dominant record surface now carries each section instead of multiple decorative cards.
- Typography, spacing, borders, and alignment carry hierarchy; icons are limited to state and action recognition.
- TasteSkill’s dashboard exclusion was respected: its anti-slop and redesign protocol informed the work, while the employer console uses the denser table structures required by the product brief.

## Reference study

- Official member IA retained: Home, View, Manage, Account, and Online Services.
- Official employer IA retained: Member, Establishment, Payments, Requests/approvals, and operational information.
- Service history, member-change review, current/proposed comparisons, and persistent identity context were retained as structural patterns.
- Legacy styling, official logos, seals, tiny type, and inaccessible dropdown patterns were not copied.
- Generated ImageToCode references are stored in `references/generated` and were used as layout studies, not production assets.

## Design system summary

- Canvas `#F4F6F7`, white surfaces, charcoal text, and neutral grey borders.
- Institutional teal `#0B6069` is limited to active navigation, links, and primary actions.
- Green is success only; amber is attention; red is blocker/destructive; blue is information.
- Panels use 8px radii; controls use 6px radii; pills are reserved for statuses.
- Authenticated page titles are 28-32px; section titles are 18-22px; body text is 14-16px.
- No automatic dark theme, gradients, glassmorphism, coloured shadows, or large teal content blocks.
- Full specification: `docs/DESIGN_SYSTEM.md`.

## Required routes visually reviewed

- Member: `/`, `/member`, `/manage`, `/online-services`, `/withdraw`, `/withdraw/preflight`
- Employer: `/employer`, `/employer/requests`
- Connected flow checks: `/issues/[issueId]`, `/manage/mark-exit`, `/employer/requests/[requestId]`, `/withdraw/review`, `/claims/[claimId]`, `/demo`

## Screenshot evidence

- Before: 16 screenshots at 1440x900 and 390x844.
- Iteration 1: 40 screenshots at 1440, 1280, 768, 390, and 320 widths.
- Iteration 2: 40 screenshots at the same five widths.
- Final settled evidence: 16 screenshots at 1440x900 and 390x844.
- Final screenshot capture includes a 1200ms settle delay so dynamic routes are shown after their loading skeletons.

## Playwright workflows tested

1. Every required route renders an H1 and has no page-level horizontal overflow at 1440, 1280, 768, 390, and 320 pixels.
2. Full withdrawal workflow: 5/7 preflight, resolve Date of Exit, reach 6/7, create employer request, start employer review, approve the change, reach 7/7, review the Form 19 claim, and submit it.

## Final validation

- Lint: passed with zero warnings.
- Typecheck: passed.
- Unit/domain tests: 14 passed.
- Playwright: 2 passed, including 40 route/viewport overflow assertions and the complete two-role claim workflow.
- Production build: passed with all routes compiled.
- Dependency audit after adding Playwright: zero vulnerabilities.
