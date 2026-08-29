# EPFO One visual system

## Product character

EPFO One is an independent public-service prototype. It should feel calm, precise, trustworthy, and operational. It is not a fintech marketing site and not a generic SaaS dashboard.

## Design dials

- Design variance: 3/10
- Motion intensity: 2/10
- Visual density: 6/10 overall, 8/10 in employer operations

## Colour

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#F4F6F7` | Page background |
| Surface | `#FFFFFF` | Records, panels, tables |
| Surface muted | `#EEF1F2` | Table headers, selected rows, quiet grouping |
| Ink | `#20262B` | Primary text |
| Muted | `#5C6870` | Secondary text |
| Line | `#D7DDE0` | Default dividers and borders |
| Line strong | `#AFB9BE` | Controls and stronger separation |
| Institutional teal | `#0B6069` | Active navigation, links, primary action |
| Teal strong | `#084B52` | Primary hover |
| Success | `#287348` | Verified or completed state only |
| Warning | `#915817` | Attention or due state only |
| Danger | `#B3261E` | Blocker, rejection, or overdue state only |
| Information | `#275D89` | Neutral information state only |

Large colour-filled content panels are not permitted. Colour is semantic and local.

## Typography

- Typeface: Geist Sans with system sans-serif fallback.
- Page title: 28-32px desktop, 26-28px compact layouts, weight 650.
- Section title: 18-22px, weight 650.
- Body: 14-16px, line-height 1.5-1.65.
- Metadata and labels: 12-13px. Uppercase is limited to short labels.
- Monetary values and dates use tabular numerals.
- Headings use balanced wrapping; body copy uses pretty wrapping.

## Shape and elevation

- Panels and tables: 8px radius.
- Buttons and inputs: 6px radius.
- Status badges: pill shape is allowed because the shape encodes state.
- No gradients, glass effects, backdrop blur, or decorative shadows.
- Default separation is a one-pixel border or divider.

## Layout

- Shared maximum content width: 1184px.
- Member pages: 24px desktop vertical rhythm, 16px compact rhythm.
- Employer pages: 16px desktop rhythm and denser tables.
- Prefer one dominant record surface per section over grids of equal cards.
- Mobile tables become labelled stacked records. They never require horizontal page scrolling.

## Shell

### Member

- White identity band: EPFO ONE, independent-redesign label, masked UAN, member name, and role switch.
- White navigation row: Home, View, Manage, Account, Online Services.
- Active destination uses teal text and a two-pixel underline.

### Employer

- Narrow charcoal utility band: EPFO ONE and Employer services.
- White establishment band: employer name and masked Establishment ID.
- Dense navigation row: Overview, Members, Establishment, Payments, Requests, Reports.
- Employer content carries a role-specific class and tighter spacing.

## Components

- Buttons are compact, text-led, and at least 44px high for touch targets.
- Status always includes readable text and an icon or distinct shape, never colour alone.
- Information notices use a left semantic rule with a quiet tinted background.
- Record lists use row dividers, aligned metadata, and a single clear action.
- Icons are limited to status, disclosure, or unambiguous actions. Decorative icon tiles are not permitted.

## Interaction and accessibility

- Include a visible-on-focus skip link.
- Every interactive control has a visible focus ring.
- Use semantic links for navigation and buttons for actions.
- Never use `transition: all`.
- Honour reduced-motion preferences.
- Disabled actions remain legible and explain why they are disabled nearby.
- Error messages use `role="alert"`; asynchronous status text uses `aria-live="polite"` where applicable.
- Minimum supported viewport width is 320px.
