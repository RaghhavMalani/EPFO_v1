# EPFO One Experience V2

## Design read

EPFO One is a two-role public financial operating system for citizens and employers. It must combine public-service trust, financial clarity, and operational depth without borrowing the visual language of SaaS dashboards, crypto products, legacy government sites, or grey ERP software.

## TasteSkill directions

### 1. Civic Ledger Atlas (selected)

- Density: high but open; typographic scale, ledger rows, dividers, and small data graphics carry the information.
- Typography: refined grotesk with oversized financial anchors and tabular numerals.
- Navigation: compact institutional navy masthead with a single horizontal product navigation.
- Data visualisation: employment and contribution data form connected journeys rather than isolated widgets.
- Composition: asymmetric bands, one dominant state or data story per screen, and varied section rhythm.
- Brand expression: navy foundation, restrained teal, semantic colours only.

This direction best expresses “civic intelligence / financial operating system” while remaining approachable to a citizen.

### 2. Public Service Studio

- Density: medium and more spacious.
- Typography: calmer scale with more explanatory copy.
- Navigation: citizen-language service groupings.
- Data visualisation: softer life-journey illustrations and guided explanations.
- Composition: broad conversational bands and gentle two-column layouts.
- Brand expression: friendly and human.

This direction was not selected because the illustrated language reduced the sense of a serious financial system and risked feeling like a traditional public-information portal.

### 3. National Financial Console

- Density: highest of the three.
- Typography: compact operational hierarchy with strong numeric emphasis.
- Navigation: deep service taxonomy and command/search affordances.
- Data visualisation: event rails, sparklines, dense ledgers, and state timelines.
- Composition: a cockpit-like data canvas.
- Brand expression: authoritative and powerful.

This direction was not selected because it came too close to the enterprise-admin/ERP failure identified in the V1 audit.

Generated studies live in `artifacts/experience-v2/directions`.

## AwesomeDesign formalisation

The selected system keeps AwesomeDesign's useful principles: strong spatial tension, a deliberate type scale, tactile interactive feedback, and motion that communicates state. Its glass, gradient, shadow, pill-navigation, and nested double-bezel defaults are explicitly excluded by the product brief.

### Core tokens

| Role | Token | Value |
| --- | --- | --- |
| Navy masthead | `--navy-950` | `#061A3F` |
| Navy text | `--navy-900` | `#0A1E48` |
| Institutional teal | `--teal-600` | `#087F7B` |
| Active teal | `--teal-500` | `#0AA7A0` |
| Canvas | `--canvas` | `#F7F9FB` |
| Surface | `--surface` | `#FFFFFF` |
| Quiet surface | `--surface-muted` | `#F0F4F7` |
| Divider | `--line` | `#D8E1E8` |
| Body text | `--ink` | `#15233F` |
| Secondary text | `--muted` | `#60708B` |
| Success | `--success` | `#0B7D55` |
| Attention | `--warning` | `#B86B00` |
| Blocking | `--danger` | `#B42318` |
| Information | `--info` | `#1559B7` |

### Type and scale

- Page title: 30–34px, weight 650, tight tracking.
- Section title: 18–20px, weight 650.
- Body: 14–16px, line-height 1.5–1.65.
- Data anchor: 52–64px desktop and 40–48px mobile, tabular numerals.
- Secondary metric: 22–30px, tabular numerals.
- Labels: 12–13px, sentence case by default.
- Geist is retained because it is already installed and highly readable. Character comes from scale, rhythm, and composition rather than a gratuitous font swap.

### Shape and surfaces

- Structural panel radius: 8px.
- Controls: 6px.
- Status pills: allowed only when the shape communicates state.
- No gradients, glass, backdrop blur, decorative shadows, giant coloured surfaces, or nested panels.
- Use open sections and dividers first; use a bordered panel only where a bounded work surface is necessary.

### Layout rhythm

Every primary screen follows a three-beat rhythm:

1. A large account, amount, or workflow-state moment.
2. A meaningful visualisation such as a journey, progress map, trend, or transfer flow.
3. Dense operational rows for inspection and action.

Member pages use a maximum content width of 1440px and 24–32px gutters. Employer pages use the same shell with tighter 16–24px internal spacing. Tables become labelled stacked records below 768px and must not create page-level horizontal scrolling.

### Motion

Motion is limited to readiness changes, claim and transfer progression, ECR validation readiness, contribution posting, and employer approval. All motion uses opacity and transform, lasts 180–450ms, has a reduced-motion fallback, and never delays access to information.

## ImageToCode extraction

Generated section references live in `artifacts/experience-v2/references`.

- `passbook.png`: balance breakdown, contribution trend, anomaly row, and focused explanation.
- `employment.png`: connected employment/PF graph with expandable record detail.
- `preflight.png`: seven-check readiness map with a two-step action plan.
- `advance.png`: deterministic eligibility calculation and review state.
- `transfer.png`: previous-to-current employer consolidation and eight-state timeline.
- `claims.png`: claim centre with active progression and past-claim ledger.
- `employer-home.png`: dense employer operations overview.
- `employer-requests.png`: current-versus-proposed correction decision.
- `employer-ecr.png`: synthetic ECR validation table, issue inspector, and cross-role event consequence.

These images are implementation references, not production assets.
