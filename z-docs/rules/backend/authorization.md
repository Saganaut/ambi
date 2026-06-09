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

The service is the only thing that decides which capability an operation needs. Each public method **loads** the aggregate (`private X load(id)` → `*_NOT_FOUND`), runs a private **`requireView` / `requireEdit` / `requireManage`** gate that throws `ForbiddenException` (`*_FORBIDDEN`) on denial, then proceeds. Org role is resolved lazily — personal-resource checks never hit the user store. See `DeckService.load` / `requireView` / `requireEdit` / `requireManage` / `orgRoleFor` (two overloads).

Principal plumbing is a fixed set of private helpers, mirrored verbatim across services: `private static String userId(AmbiPrincipal)`, `level(...)`, `requireUserId(...)` (→ `UnauthorizedException` when identity is missing). Don't reach into the principal inline; use the helpers.

## 3. Capabilities ride back on the response

A public `ViewerPermissions permissionsFor(aggregate, AmbiPrincipal)` computes the requester's `(canView, canEdit, canManage)` triple, and the controller stamps it onto the response DTO — `DeckController.toResponse` is `DeckResponse.from(deck, deckService.permissionsFor(deck, principal))`. The client reads these booleans to decide which affordances to show; the backend stays the single source of truth. Rationale (the client can't evaluate the rules itself — ownership/ACL are keyed by internal id) is in the [`ViewerPermissions`](../../../backend/src/main/java/com/cephadex/ambi/common/ViewerPermissions.java) Javadoc. Present on `DeckService`, `GalleryService`, `ThemeService`.

## 4. Ownership is a polymorphic value object

Shareable aggregates carry `Ownership(type, ownerId)` where `type ∈ {USER, ORGANIZATION}` — the single source of truth for control. Branch on `ownership.type()` (helpers `isUserOwned()` / `isOrgOwned()` / `isUserOwner(userId)`), **never** on a denormalized mirror like `organizationId` (that exists only for cheap indexed listing). See the deck README's "four orthogonal axes" for the full model.

## 5. Disclosure (404 vs 403)

Which denials mask as `404` and which are honest `403` is governed by the [exception rules](../exception-rules.md) §5 (random-id resources → honest 403; guessable-key resources → masked 404). Don't re-decide it here.
