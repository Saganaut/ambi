# Membership & Pricing

Frontend scaffolding for a public pricing page. Stripe integration is
intentionally **out of scope** — the components are shaped so a billing
provider can be slotted in later without rework.

The backend membership model already exists and is documented separately:
`billing/Membership`, `billing/BillingState`, `MembershipTier` (`FREE`,
`INDIVIDUAL`, `ORG_SEAT`, `ORG_TEAM`, `ORG_BUSINESS`), `MembershipStatus`,
`PaymentProvider`, `org/OrgMembership`, `org/enums/OrgRole`, and
`GET /api/orgs/mine` — see
[`auth/README.md`](../../../backend/src/main/java/com/cephadex/ambi/auth/README.md).

## Frontend

Components in `frontend/src/pages/PricingPage/components/` — read the props
interfaces for detail:

- `FeatureList` — a plan's bulleted features; `included: false` renders a struck-through "not in this tier" entry without rearranging the list.
- `PricingCard` — one tier, composing `FeatureList`. Its CTA is discriminated across router `<Link>` / external `<a>` / `<button onClick>`; a `featured` variant lifts the recommended tier.
- `PricingGrid` — responsive container; the caller picks 2/3/4 columns above the wrap breakpoint.
- `BillingToggle` — stateless monthly/annual radio group with a per-option savings chip.

The page itself (`PricingPage/`) composes the three, with `usePricingPage.ts`
owning billing-cycle state and resolving the active price per tier. `data.ts`
holds placeholder `PRICING_TIERS` shaped like a future Plan API response, so
swapping it for an RTK Query call against `/api/billing/plans` is a one-place
change.

The route is `frontend/src/routes/pricing.tsx`, a thin shim per convention. The
NavBar's "Pricing" link exists but is **commented out** (`NavBar.tsx:27-29`).

## Deliberately absent

Stripe SDK, webhooks, checkout sessions and the customer portal;
upgrade/downgrade APIs and their UI; seat-assignment endpoints and the org-admin
UI; and real pricing copy — current content is placeholder.
