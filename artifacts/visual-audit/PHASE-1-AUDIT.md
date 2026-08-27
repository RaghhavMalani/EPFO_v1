# EPFO One Visual Audit

Captured before implementation on 26 August 2026 at 1440x900 and 390x844.

## Design read

Full visual overhaul of authenticated public-service software for members, employers, and EPFO reviewers. The target is a Swiss-rational institutional interface with familiar public-service structure, contemporary accessibility, and visibly different citizen and operational modes.

- `DESIGN_VARIANCE: 3`
- `MOTION_INTENSITY: 2`
- `VISUAL_DENSITY: 6`
- Theme: one light institutional system

## Current strengths to preserve

- Clear route structure and descriptive page titles.
- Functional keyboard-ready links and buttons.
- Deterministic status language and responsible-party copy.
- Consistent spacing and predictable mobile collapse.
- Synthetic-data disclosure remains visible throughout the application.
- Domain and task flows are already coherent.

## Findings

### Information hierarchy

- The member home distributes attention across many equal containers. Balance, readiness, active requests, quick goals, claims, and activity compete instead of forming a clear top-to-bottom task hierarchy.
- Preflight gives the largest visual area to the 71% number even though the blockers and their resolution paths are the most important content.
- Employer pages repeat the same low-density introductory composition as the member pages. Operational queues should begin earlier and carry more information per row.

### Visual density and containment

- Nearly every concept is placed in a bordered card. Cards often express decoration rather than meaningful containment.
- Repeated `rounded-2xl` panels, icon tiles, and inset surfaces create a generic component-library dashboard appearance.
- Desktop pages use large empty margins while the useful content remains compartmentalized in low-density boxes.
- Mobile turns the same card system into long vertical stacks, especially on Manage and Online Services.

### Radius and shape

- Large 16px radii are applied to account summaries, services, records, alerts, status areas, and employer operations without a semantic rule.
- Buttons and panels share an overly soft visual character that weakens institutional seriousness.

### Color

- `#166052` is used as both navigation accent and large filled-card color.
- Large teal areas make the product feel like a branded fintech dashboard.
- Green is used for both brand expression and success, reducing semantic clarity.
- The current dark-mode token set is automatic even though the requested product requires one carefully controlled light theme.

### Typography

- Headings are frequently 36-48px and feel closer to marketing pages than authenticated service software.
- Eyebrows use repeated uppercase tracking, adding an AI-generated design tell instead of functional orientation.
- Metadata is sometimes too small relative to the generous page scale.
- Numeric account information needs tabular figures and tighter alignment.

### Icons

- Icons appear beside routine section headings, verification values, service cards, activity rows, and metadata.
- Repetition reduces recognition value and creates decorative noise.
- Status icons are useful and should remain where they reinforce a text label.

### Navigation

- The shell lacks clear institutional hierarchy between product identity, member identity, role, and section navigation.
- The member and employer experiences share the same header and primary navigation treatment.
- At 390px the navigation overflows horizontally and exposes clipped items without an explicit mobile navigation model.
- Account is missing from the requested Member Portal navigation language.

### Member home

- The giant teal balance card and account-health card create dashboard-card soup.
- Six blocks have similar visual weight, obscuring the three essential questions: balance, attention, and available actions.
- Quick goals are presented as equal feature cards rather than a compact service launcher.

### Preflight

- The 71% tile is visually dominant but not operationally useful.
- The seven checks are split into large containers rather than one legible checklist.
- Blocker cards repeat labels and metadata but do not foreground the required five-part resolution structure.
- The amount and Form 19 context are absent from the first visual hierarchy.

### Member history

- Employment records are individually boxed and oversized.
- Desktop does not use the available width for table-like comparison.
- Mobile records are readable but very long and visually repetitive.

### Manage and Online Services

- Five verification items become five cards, even though a labeled status list is more appropriate.
- Online Services uses a SaaS feature-card grid instead of service groups reflecting the portal information architecture.
- Secondary preview services consume the same space as primary functional services.

### Employer experience

- Employer Home is structurally the Member Home with establishment copy.
- Operational tasks appear below a large decorative establishment panel.
- Request rows lack table headers, filters, and explicit action columns.
- Desktop density is too low for a queue-management surface.

### Accessibility and responsive behavior

- Core controls have visible focus treatments and semantic elements.
- The shell needs a skip link and a stable mobile navigation pattern.
- Status treatment generally combines text and color, which is good.
- Long mobile pages create excessive scroll cost because desktop cards simply stack.
- Form placeholders and async action text need typographic ellipses and `aria-live` handling.
- Sticky navigation must preserve focus visibility and avoid covering focused content.

## Patterns to retire

- Large dark-teal summary panels.
- Automatic dark theme.
- Green-tinted shadows.
- `rounded-2xl` as the default container.
- Equal-weight metric and service cards.
- Decorative icons beside ordinary headings and metadata.
- Marketing-scale page titles.
- Shared member/employer visual shell.
- Percentage progress track on Preflight.

## Screenshot inventory

Before screenshots are under:

- `artifacts/visual-audit/before/desktop/`
- `artifacts/visual-audit/before/mobile/`

Routes captured: `/`, `/member`, `/manage`, `/online-services`, `/withdraw`, `/withdraw/preflight`, `/employer`, and `/employer/requests`.
