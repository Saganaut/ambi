# Membership & Pricing — Notes

Scaffolding for paid memberships and a public pricing page. Stripe integration
is intentionally **out of scope** for now — the data model and components are
shaped so a billing provider can be slotted in later without schema churn.

## Backend

### New enums (`backend/.../model/enums/`)

- `MembershipTier`
  - `FREE` — default for new users.
  - `INDIVIDUAL` — paid single-user plan.
  - `ORG_SEAT` — user occupies a seat on an organization plan (billing lives
    on the organization, not the user).
  - `ORG_TEAM`, `ORG_BUSINESS` — organization-level plan SKUs.
- `MembershipStatus` — `ACTIVE | TRIALING | PAST_DUE | CANCELED | EXPIRED | NONE`.
  Mirrors the standard subscription states so UI gating reads a single field.

### New embedded documents (`backend/.../model/`)

- `Membership` — embedded on `User`.
  - `tier`, `status`
  - `startedAt`, `currentPeriodEnd`
  - `cancelAtPeriodEnd`
  - `sourceOrganizationId` — populated only when `tier == ORG_SEAT`; identifies
    the organization granting the seat.
  - `stripeCustomerId`, `stripeSubscriptionId` — opaque placeholders for the
    Stripe integration.
- `OrganizationPlan` — embedded on `Organization`.
  - `tier`, `status`, `seatLimit`
  - `startedAt`, `currentPeriodEnd`, `cancelAtPeriodEnd`
  - `stripeCustomerId`, `stripeSubscriptionId`

Seat accounting lives on each `User.membership` (tier `ORG_SEAT` +
`sourceOrganizationId`); `OrganizationPlan.seatLimit` is the cap that future
seat-assignment logic must enforce.

### Model updates

- `User` — new field `Membership membership = new Membership()` so every
  existing user lands on a `FREE`/`NONE` record by default.
- `Organization` — new field `OrganizationPlan plan = new OrganizationPlan()`.

### DTO updates

- `UserDTO.RegisteredUser` — adds `Membership membership` (constructor passes
  through `user.getMembership()`). `GuestUser` deliberately unchanged: guests
  cannot subscribe.
- `OrganizationDTO.OrganizationResponse` — adds `OrganizationPlan plan` so
  callers can render seat usage / plan tier alongside the org name.

### Endpoints

No new endpoints yet — `Membership` and `OrganizationPlan` ride along the
existing `/api/auth/me` and `/api/organizations/me` responses. Stripe webhooks,
upgrade/downgrade controllers, and seat-assignment endpoints will be added
when billing is wired up.

## Frontend

### Reusable components (`frontend/src/components/Pricing/`)

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
- `NavBar` — new top-level "Pricing" link.

## What's deliberately not here

- Stripe SDK, webhook handlers, checkout sessions, customer portal.
- Upgrade/downgrade APIs and the UI flows that drive them.
- Seat assignment endpoints (`POST /api/organizations/me/seats`, etc.) and the
  org-admin UI for managing them.
- Real pricing copy, feature lists, and tier counts — current content is
  placeholder per the task brief.

## When Stripe lands, expect to

1. Add Stripe webhook controller that updates `User.membership` and
   `Organization.plan` based on `customer.subscription.*` and `invoice.*` events.
2. Map placeholder `PRICING_TIERS` to Stripe price IDs (probably via a backend
   `/api/billing/plans` endpoint) and replace the static import in
   `usePricingPage` with an RTK Query hook.
3. Wire each `PricingCard` CTA to a checkout-session creator instead of the
   current placeholder `Link` destinations.
4. Add a `useCanAccess` (or similar) hook that reads
   `membership.tier`/`status` and gates premium UI behind it.
