# Iteration 1 critique

## Screenshot matrix

Forty screenshots were captured across all eight required routes at viewport widths 1440, 1280, 768, 390, and 320 pixels.

## What worked

- Member home now answers balance, attention, actions, and recent activity in that order.
- Form 19 preflight shows ₹3,20,400, all seven checks, five passed states, both blocker structures, and the disabled decision action without a percentage card.
- Service history behaves as an aligned table on desktop and a labelled record list on phones.
- Manage and Online Services use grouped rows rather than repeated cards.
- Employer pages are visibly distinct and denser, with persistent establishment context and queue-first structure.
- Semantic colour remains local and every status includes text and an icon or outlined badge.

## Issues found

1. Member navigation truncated “Online Services” at 390 and 320 pixels.
2. Employer navigation exposed low-value anchor destinations before Requests on phones.
3. Blocker details stayed in three columns at 390 pixels, making owner and required action unnecessarily narrow.
4. The full employer request table inherited an 18px final column and clipped the “Review” action.
5. Legacy screens still carried the previous 16px radius utility even though their colour and hierarchy had already inherited the new system.
6. The demo controller retained one large teal metric tile.

## Fixes applied

- Added concise phone labels and reduced phone navigation spacing.
- Limited employer phone navigation to Overview, Members, and Requests.
- Stacked blocker-resolution details below 720 pixels.
- Gave the full employer table a dedicated action-column width.
- Normalised remaining panel radii to 8px and control radii to 6px.
- Replaced the demo controller teal tile with a neutral bordered metric.
