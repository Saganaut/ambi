# Deck — domain & permissions

The `Deck` aggregate and its CRUD (`DeckService` + `DeckRepository`). This doc is the
authority for **who may do what to a deck**. The permission rules below are enforced as
pure predicates on the `Deck` aggregate (`canBeViewedBy` / `canBeEditedBy` /
`canBeManagedBy`) and applied by `DeckService` (`requireView` / `requireEdit` /
`requireManage`), which translates a denial into the typed exceptions from the
[exception contract](../../../../../../../../../z-docs/features/exceptions.md).

> A deck used **as a presentation** is out of scope here. A live run takes a _snapshot_
> of the deck into a separate object (see `session/`), so nothing in this package has to
> reason about runtime-session access — only about authoring/sharing the deck itself.

---

## The four orthogonal axes

Access is decided from four independent pieces of state. Keeping them separate is the
whole design — conflating "who owns it" with "who can see it" is what makes permission
code rot.

| Axis                | Field(s)                        | Answers                                 | Values                                      |
| ------------------- | ------------------------------- | --------------------------------------- | ------------------------------------------- |
| **Ownership**       | `ownership : Ownership`         | _Who controls this deck?_               | `USER` (a person) / `ORGANIZATION` (an org) |
| **Visibility**      | `visibility : DeckVisibility`   | _Who, beyond the owner, may view it?_   | `PRIVATE` / `UNLISTED` / `ORG` / `PUBLIC`   |
| **Publish status**  | `publishStatus : PublishStatus` | _Is it exposed to non-editors yet?_     | `DRAFT` / `PUBLISHED` / `ARCHIVED`          |
| **Explicit shares** | `acl : List<DeckAccessGrant>`   | _Which named users got a direct grant?_ | per-user `VIEWER` / `EDITOR`                |

Plus two cross-cutting inputs that come from the **requester**, not the deck:

- **Org role** — the requester's `OrgRole` (`OWNER` / `ADMIN` / `USER`) in _this deck's_
  owning org, resolved from `User.orgRoles`. `null` if the deck isn't org-owned or the
  requester isn't a member.
- **Platform level** — the requester's `UserLevel`. `ADMIN`+ is a global moderation
  override.

### Ownership (`Ownership`)

`Ownership(type, ownerId)` is the **single source of truth for control**:

- `type = USER` → `ownerId` is a `User` id. A personal deck.
- `type = ORGANIZATION` → `ownerId` is an organization id. A team deck.

`organizationId` on the deck is a **denormalized, indexed mirror** of `ownerId` when
`type = ORGANIZATION` (and `null` otherwise). It exists only so "list all decks in org X"
is a cheap indexed query; `DeckService.create` keeps it in sync. Never branch on it for
authorization — branch on `ownership.type`.

> **`creatorUserId` vs `ownership.ownerId`.** `creatorUserId` is immutable attribution
> ("who first made this"); `ownership.ownerId` is current control ("who owns it now").
> They're usually equal for personal decks but diverge after a transfer, so **only
> ownership drives auth**. `originalAuthorUserId` is fork/copy attribution and is never
> used for auth either.

### Visibility (`DeckVisibility`)

Visibility only ever _grants view_ — it never grants edit.

| Value      | Who can view (once published)                      | Discoverable in listings? |
| ---------- | -------------------------------------------------- | ------------------------- |
| `PRIVATE`  | nobody but the owner / editors / explicit ACL      | no                        |
| `UNLISTED` | anyone who has the id or `publicId` (link sharing) | no                        |
| `ORG`      | any member of the owning org (org decks only)      | within the org            |
| `PUBLIC`   | everyone, incl. anonymous                          | yes                       |

`UNLISTED` is modelled as "viewable by id, just not listed." Hiding it is a **query**
concern: discovery/listing queries must filter to `PUBLIC` + `PUBLISHED`
(`DeckRepository.findByVisibilityAndPublishStatus`). The per-deck `canBeViewedBy` check
treats a published `UNLISTED` deck as viewable by anyone who already holds its id, because
by the time we run the check they've already resolved it.

### Publish status gates exposure

`publishStatus` is the safety latch in front of visibility: **visibility is only honored
once the deck is `PUBLISHED`.**

- `DRAFT` / `ARCHIVED` → visible to **editors, managers, and explicit ACL grants only**,
  regardless of how "public" `visibility` says it is. A `PUBLIC` + `DRAFT` deck is _not_
  world-readable.
- `PUBLISHED` → `visibility` is honored as in the table above.
- `ARCHIVED` is therefore "unpublished again" — pulled from public view, still editable by
  its team.

### Explicit shares (`acl`)

`acl` is a list of `DeckAccessGrant(userId, role)` where `role ∈ {VIEWER, EDITOR}`. A grant
is an **intentional, named** share and so it wins even against `DRAFT` (you can share a
work-in-progress with a specific collaborator). `acl` never grants `MANAGE`.

> **Why not a flat `Set<String>`?** The previous shape couldn't express view-vs-edit, so
> every share would have been all-or-nothing. Carrying a per-user role is the minimum
> needed to honor "viewable but not editable," which is the whole point of the feature.

---

## The capability ladder

Three capabilities, strictly nested (`MANAGE ⊃ EDIT ⊃ VIEW`):

| Capability | Covers                                                        | Granted to                                                     |
| ---------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| **VIEW**   | read the deck & its slides                                    | see resolution below                                           |
| **EDIT**   | change content/metadata, publish/unpublish                    | owner · org `OWNER`/`ADMIN` · ACL `EDITOR` · platform `ADMIN`+ |
| **MANAGE** | delete, transfer ownership, change visibility, manage the ACL | owner · org `OWNER` · platform `ADMIN`+                        |

### Resolution — `canBeManagedBy(userId, level, orgRole)`

```text
platform ADMIN+                         → allow
USER-owned   && userId == ownerId       → allow
ORG-owned    && orgRole == OWNER        → allow
otherwise                               → deny
```

Management is deliberately the _narrowest_ ring: destructive/structural actions
(delete, re-own, re-share, flip visibility) need the owner or an org **OWNER**. Org
`ADMIN`s can edit content but not dissolve or re-home the deck. ACL grants never confer
manage.

### Resolution — `canBeEditedBy(userId, level, orgRole)`

```text
platform ADMIN+                         → allow
USER-owned   && userId == ownerId       → allow
ORG-owned    && orgRole ∈ {OWNER,ADMIN} → allow
ACL role == EDITOR                      → allow
otherwise                               → deny
```

This is the "members who have the appropriate role can edit" rule: in an org, `OWNER` and
`ADMIN` edit; a plain `USER` member cannot (they fall through to view-only).

### Resolution — `canBeViewedBy(userId, level, orgRole)`

```text
canBeEditedBy(...)                      → allow   (editors always view, incl. drafts)
ACL role present (VIEWER or EDITOR)     → allow   (named share, even on a draft)
publishStatus != PUBLISHED              → deny    (nobody else sees unpublished)
visibility == PUBLIC                    → allow
visibility == UNLISTED                  → allow   (holder of the id/publicId)
visibility == ORG  && org member        → allow
visibility == PRIVATE                   → deny
```

These three methods are **pure functions of the deck's own state plus the requester's
`(userId, level, orgRole)` triple** — no repository access, no Spring. That makes them
trivially unit-testable and keeps the rules in the aggregate where the invariants live.

---

## How the service applies it

`DeckService` is the only thing that decides _which_ capability a given operation needs,
loads the deck, resolves the requester's org role, and throws on denial:

| Operation                                         | Required capability | On deny                     |
| ------------------------------------------------- | ------------------- | --------------------------- |
| `getViewable` / `listForOrg` member read          | VIEW                | `403 DECK_VIEW_FORBIDDEN`   |
| `update` (content, metadata, publish)             | EDIT                | `403 DECK_EDIT_FORBIDDEN`   |
| `delete`, `setVisibility`, `share`, `revokeShare` | MANAGE              | `403 DECK_MANAGE_FORBIDDEN` |
| `create`                                          | authenticated user  | `401 AUTH_REQUIRED`         |
| deck id not found                                 | —                   | `404 DECK_NOT_FOUND`        |

**Creation is optimistic.** The client mints the deck's UUID and `create(id, principal)`
persists a fresh **personal** deck owned by the caller with the aggregate's field defaults
(`name`, `PRIVATE`, `DRAFT`, `en`, …). Org-owned decks aren't created directly — a deck is
born personal and moved to an org via a (future) MANAGE-gated transfer.

**404 vs 403.** Per the [exception contract's tiered policy](../../../../../../../../../z-docs/features/exceptions.md#404-vs-403-the-disclosure-decision),
decks are keyed by a high-entropy id, so we use an **honest 403** — a forbidden view
returns `403`, not a masked `404`. (Room-code resources mask; decks do not.)

The requester is passed in as the `AmbiPrincipal` from the controller. The service loads
the backing `User` **only when the deck is org-owned**, to read `orgRoles` and resolve the
caller's `OrgRole` for that org; personal-deck checks never hit the user store.

### Repository surface

`DeckRepository extends MongoRepository<Deck, String>` with the finders the service and
listing endpoints need:

- `findByPublicId` — share-link resolution (`publicId` is unique-indexed).
- `findByOwnershipTypeAndOwnershipOwnerId` — "my personal decks."
- `findByOrganizationId` — "all decks in an org" (uses the denormalized indexed mirror).
- `findByVisibilityAndPublishStatus` — public/discoverable listing (`PUBLIC` + `PUBLISHED`).

---

## What the `Deck` aggregate needs for permissions

A checklist of the state the rules above depend on, and what changed to support them.

| State                                                       | Status                                                                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `ownership : Ownership` (type + ownerId)                    | existed                                                                                                            |
| `organizationId` (indexed denormalized mirror)              | existed — kept in sync by `create`                                                                                 |
| `creatorUserId` / `originalAuthorUserId` (attribution only) | existed                                                                                                            |
| `publishStatus : PublishStatus`                             | existed                                                                                                            |
| `publicId` (unique, share link)                             | existed                                                                                                            |
| **`visibility : DeckVisibility`**                           | **added** — the enum existed but was never a field; nothing could express "public to view, not to edit" without it |
| **`acl : List<DeckAccessGrant>`**                           | **changed** from `Set<String>` — a flat id set can't carry a per-user `VIEWER`/`EDITOR` capability                 |
| **`DeckAccessGrant(userId, role)`**                         | **added** record                                                                                                   |
| **`DeckAclRole { VIEWER, EDITOR }`**                        | **added** enum                                                                                                     |
| `canBeViewedBy` / `canBeEditedBy` / `canBeManagedBy`        | **added** — the pure predicates above                                                                              |

### Design decisions — please confirm or adjust

1. **`OwnershipType.PUBLIC` removed.** "Public" is a _visibility_, not an _ownership_ — a
   deck is always owned by a `USER` or an `ORGANIZATION`. Public exposure is now
   `visibility = PUBLIC`. `OwnershipType` is `{USER, ORGANIZATION}`.
2. **Org `ADMIN` can edit but not manage.** Delete / transfer / re-share / visibility
   changes require org `OWNER` (or the platform). If team `ADMIN`s should also be able to
   delete or change visibility, widen `canBeManagedBy`.
3. **Publishing is an EDIT action**, not MANAGE — any editor can flip `DRAFT ⇄ PUBLISHED`.
   Move it to MANAGE if publishing should be owner-gated.
4. **`acl` grants cap at `EDITOR`** (never `MANAGE`). Sharing can't hand over the keys.
5. **Platform `ADMIN`+ is a global override** on all three capabilities (moderation).
