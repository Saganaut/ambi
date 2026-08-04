# Authorization — pure predicates on the aggregate, applied by the service

**Rule:** Authorization is **domain logic, not annotations.** Every shareable aggregate decides access through pure permission predicates on the aggregate itself; the service loads the aggregate, resolves the requester's org role, and throws a typed `ApiException` on denial; the requester's resulting capabilities ride back to the client on the response as a `ViewerPermissions`. There is **no `@PreAuthorize`** in the codebase, and adding one is off-pattern.

The worked authority is the [deck permission model](../../../backend/src/main/java/com/cephadex/ambi/presentation/deck/README.md). This file states the cross-cutting convention that Deck, Gallery, and Theme all follow.

## 1. Permission predicates live on the aggregate and are pure

The aggregate exposes the capability ladder as side-effect-free methods of its own state plus the requester's `(userId, level, orgRole)` triple — no repository access, no Spring:

```java
boolean canBeViewedBy(String userId, UserLevel level, OrgRole orgRole)
boolean canBeEditedBy(String userId, UserLevel level, OrgRole orgRole)
boolean canBeManagedBy(String userId, UserLevel level, OrgRole orgRole)
```

`MANAGE ⊃ EDIT ⊃ VIEW`. Resources with no edit/manage split (themes) still implement all three; `canEdit` mirrors `canManage`. Examples: `Deck.canBeViewedBy` (`Deck.java`), `Gallery`, `Theme`. Being pure, they're unit-tested directly against the aggregate (`DeckServiceTest` mocks the repo and lets the predicate run real).

## 2. The service applies them: load → `require*` → return

The service is the only thing that decides which capability an operation needs. Each public method **loads** the aggregate (`private X load(id)` → `*_NOT_FOUND`), runs a private **`requireView` / `requireEdit` / `requireManage`** gate that throws `ForbiddenException` (`*_FORBIDDEN`) on denial, then proceeds. See `DeckService.load` / `requireView` / `requireEdit` / `requireManage`.

Org role is resolved through the shared [`OrgRoleResolver`](../../../backend/src/main/java/com/cephadex/ambi/org/OrgRoleResolver.java) bean, injected into each service — never a per-service copy of the membership lookup. It works against the [`OwnableResource`](../../../backend/src/main/java/com/cephadex/ambi/common/OwnableResource.java) interface, so it stays type-agnostic.

Principal plumbing lives in the [`AmbiPrincipals`](../../../backend/src/main/java/com/cephadex/ambi/auth/security/AmbiPrincipals.java) utility, static-imported by each service. Don't reach into the principal inline; use the helpers.

## 3. Capabilities ride back on the response

A public `ViewerPermissions permissionsFor(aggregate, AmbiPrincipal)` computes the requester's `(canView, canEdit, canManage)` triple, and the controller stamps it onto the response DTO — `DeckController.toResponse` is `DeckResponse.from(deck, deckService.permissionsFor(deck, principal))`. The client reads these booleans to decide which affordances to show; the backend stays the single source of truth. Rationale: the [`ViewerPermissions`](../../../backend/src/main/java/com/cephadex/ambi/common/ViewerPermissions.java) Javadoc.

## 4. Ownership is a polymorphic value object

Shareable aggregates carry `Ownership(type, ownerId)` where `type ∈ {USER, ORGANIZATION}` — the single source of truth for control. Branch on `ownership.type()` (helpers `isUserOwned()` / `isOrgOwned()` / `isUserOwner(userId)`), **never** on a denormalized mirror like `organizationId` (that exists only for cheap indexed listing). See the deck README's "four orthogonal axes" for the full model.

## 5. Disclosure (404 vs 403)

Governed by [exception-rules.md](../exception-rules.md) §5.
