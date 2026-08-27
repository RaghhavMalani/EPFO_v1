# Phase 2: portal reference study

## Sources reviewed

- Live Unified Member Portal and Unified Employer Portal URLs were opened directly. Both were blocked by the network firewall used by the audit environment, so no live authenticated state was available.
- The official EPFO Unified Portal reference-document index was reviewed for its service grouping and terminology.
- An official 2026 EPFO de-linking manual was reviewed for current member navigation and service-history structure.
- Official EPFO employer correction guidance and joint-declaration procedure documents were reviewed for employer navigation, queue, and approval patterns.
- Four ImageToCode reference screens were generated and inspected: member home, service history, Form 19 preflight, and employer requests.

## Structural patterns retained

### Member portal

- Keep the familiar top-level groups: Home, View, Manage, Account, and Online Services.
- Treat the UAN and member identity as persistent context in the shell, not as page content.
- Use a service-history table/list hybrid with aligned employment fields and explicit row actions.
- Group online claims beneath Online Services and make the form type visible in context.
- Keep member profile, service history, passbook, and claims as recognisable destinations.

### Employer portal

- Make the employer identity and Establishment ID persistent in the shell.
- Organise work around Members, Establishment, Payments, Requests, and Reports.
- Present member changes as a review queue, not as a marketing dashboard.
- Show current and proposed values side by side before approval.
- Keep decision status, responsible party, and next action visible.

## Legacy patterns intentionally rejected

- Visual styling, colour, typography, dropdown density, and panel decoration from the current government portals.
- Dashboard card mosaics.
- Large coloured banners used as the primary information hierarchy.
- Icon-led navigation where text is clearer.
- Status communicated only by colour.
- Wide desktop tables that become unreadable on a phone.

## ImageToCode findings

The generated references were treated as layout studies, not assets to reproduce literally.

- `member-home.png` validated a calm, content-first balance and attention split. Its lower action tile is too card-like, so the implementation uses a compact action row instead.
- `service-history.png` validated a single dominant employment-record surface and column alignment. Its permanent left sidebar is unnecessary for this route set, so the implementation keeps the lighter top navigation.
- `form-19-preflight.png` best matches the target hierarchy: claim facts first, all seven checks visible, two issue resolutions expanded, and the decision bar last.
- `employer-requests.png` validated the dense split-view operations model. The implementation keeps the denser table language while preserving the existing route-based detail flow.

## Resulting direction

EPFO One will use a restrained institutional shell with public-service familiarity, a neutral light canvas, small-radius bordered surfaces, content-first records, and role-specific density. Member pages prioritise comprehension and guided resolution. Employer pages prioritise scan speed, queues, comparison, and decisions.
