# Membership & Pricing — Notes

Scaffolding for paid memberships and a public pricing page. Stripe integration
is intentionally **out of scope** for now — the components are shaped so a
billing provider can be slotted in later without rework.

> A concrete backend membership model already exists — `billing/Membership`,
> `billing/BillingState`, `billing/enums/MembershipTier` (`FREE`,
> `INDIVIDUAL`, `ORG_SEAT`, `ORG_TEAM`, `ORG_BUSINESS`), `MembershipStatus`,
> `PaymentProvider`; `org/OrgMembership`, `org/enums/OrgRole`; and
> `OrgController`'s `GET /api/orgs/mine` — and is documented in
> [`backend/src/main/java/com/cephadex/ambi/auth/README.md`](../../../backend/src/main/java/com/cephadex/ambi/auth/README.md).
> This doc covers only the frontend pricing-page scaffolding below.

## Frontend

### Reusable components (`frontend/src/pages/PricingPage/components/`)

All components follow project conventions: arrow-function `const`, named
export at the bottom, `ComponentNameProps` interface, CSS Modules driven by
`tokens.css`, file-level header comment explaining purpose.

- `FeatureList/FeatureList.tsx`
  - Renders a bulleted list of plan features.
  - `FeatureItem` supports `included: false` to render a struck-through "not
    in this tier" entry without rearranging the list.
- `PricingCard/PricingCard.tsx`
  - One subscription tier. Composes `FeatureList`.
  - CTA can render as a router `<Link to>`, external `<a href>`, or
    `<button onClick>` — discriminated via props.
  - `featured` variant lifts the recommended tier visually with a gradient
    border and brand-colored CTA.
  - Optional `badge` (e.g. "Most popular") and `footnote`.
- `PricingGrid/PricingGrid.tsx`
  - Responsive layout container. Caller picks 2/3/4 columns above the wrap
    breakpoint via the `columns` prop.
- `BillingToggle/BillingToggle.tsx`
  - Monthly/annual radio group. Stateless — owner holds the active cycle.
  - Per-option `savingsLabel` chip for highlighting annual discounts.

### Page (`frontend/src/pages/PricingPage/`)

- `PricingPage.tsx` — composes `BillingToggle` + `PricingGrid` + `PricingCard`.
- `usePricingPage.ts` — hook that owns billing-cycle state and resolves the
  active price per tier. Designed so swapping `PRICING_TIERS` for an RTK Query
  call against a future `/api/billing/plans` endpoint is a one-place change.
- `data.ts` — placeholder `PRICING_TIERS` (Free / Pro / Team). Shape mirrors
  what a future Plan API response is expected to look like.
- `PricingPage.module.css` — page-level layout using design tokens only.

### Route

- `frontend/src/routes/pricing.tsx` — TanStack file-based route at `/pricing`,
  delegating to `PricingPage` per the routes-as-thin-shims convention.
- `NavBar` — a top-level "Pricing" link exists but is currently **commented
  out** (`NavBar.tsx:27-29`).

## What's deliberately not here

- Stripe SDK, webhook handlers, checkout sessions, customer portal.
- Upgrade/downgrade APIs and the UI flows that drive them.
- Seat assignment endpoints and the org-admin UI for managing them.
- Real pricing copy, feature lists, and tier counts — current content is
  placeholder per the task brief.

## When Stripe lands, expect to

1. Map placeholder `PRICING_TIERS` to Stripe price IDs (probably via a backend
   `/api/billing/plans` endpoint) and replace the static import in
   `usePricingPage` with an RTK Query hook.
2. Wire each `PricingCard` CTA to a checkout-session creator instead of the
   current placeholder `Link` destinations.
3. Add a `useCanAccess` (or similar) hook that reads membership state from the
   auth response and gates premium UI behind it.
