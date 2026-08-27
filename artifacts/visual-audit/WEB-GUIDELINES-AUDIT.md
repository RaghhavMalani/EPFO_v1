# Web Interface Guidelines audit

## Scope

Reviewed the redesigned shell, shared UI components, eight required routes, connected issue and employer-decision flows, and responsive states against the current Vercel Web Interface Guidelines.

## Passing findings

- A visible-on-focus “Skip to main content” link targets the shared main landmark.
- Navigation uses native links and actions use native buttons.
- Interactive controls have visible focus treatment and minimum 44px touch height where relevant.
- Status is always expressed with text plus icon/shape, never colour alone.
- All form controls have labels; workflow errors use `role="alert"`.
- Member service history exposes semantic table, row, column-header, and cell roles while retaining a mobile record layout.
- Employer queue rows preserve native link semantics and expose labelled fields on phones.
- Page headings remain visible and ordered across every required route.
- No `transition: all` is used; reduced-motion preferences are respected.
- Async copy uses the ellipsis glyph in “Working…”.
- Monetary values, identifiers, and dates use tabular numerals where comparison benefits.
- Headings use balanced wrapping and prose uses pretty wrapping.
- All required routes pass automated page-level horizontal-overflow checks at 1440, 1280, 768, 390, and 320 pixels.
- Disabled claim continuation remains readable and is paired with a clear explanation of the two remaining blockers.

## Deliberate responsive decisions

- Member phone navigation uses the concise label “Services” to preserve all five top-level destinations without clipping.
- Employer phone navigation prioritises Overview, Members, and Requests; non-functional anchor destinations remain visible on desktop.
- Desktop record tables become labelled stacked records rather than horizontal-scroll tables.
- Preflight blocker guidance stacks at narrow widths and preserves the five requested information groups.

## Result

No blocking accessibility or interface-guideline issue remains in the audited scope. The Next.js development indicator visible in local screenshots is framework tooling and is absent from the production build.
