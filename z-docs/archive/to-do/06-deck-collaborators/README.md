# 06 — Deck collaborators

**Status:** Done
**Depends on:** 02 (publish status — co-editors edit drafts)
**Unblocks:** 16 (analytics access is owner+collaborator)

## Scope

Co-editors on a deck. The deck owner can invite others as `EDITOR` (full edit) or `VIEWER` (read in private decks). Owners can transfer ownership.

This shows up in `AuthorizationService` — every place that currently checks `creatorUserId == caller` needs to also accept `EDITOR` collaborators.

## New models

```text
DeckCollaborator                       @Document("deck_collaborators")
  @Id String id
  @Indexed String deckId
  @Indexed String userId
  CollaboratorRole role                // VIEWER | EDITOR | OWNER
  String invitedByUserId
  LocalDateTime invitedAt              // when the invite was sent
  LocalDateTime acceptedAt             // null = pending invite
  // compound unique index (deckId, userId)
```

```text
CollaboratorRole (enum)
  VIEWER, EDITOR, OWNER
```

Only one `OWNER` per deck — enforce in the service layer. The legacy `Deck.creatorUserId` stays as the historical author / original owner; the *current* owner is the row in `deck_collaborators` with `role = OWNER`.

## Backend changes

- `DeckCollaboratorRepository`, `DeckCollaboratorService`
- `AuthorizationService` — overhaul:
  - `canViewDeck(deckId, userId)` — true if deck is PUBLIC/UNLISTED, or caller is the owner, or caller is in `deck_collaborators` for that deck
  - `canEditDeck(deckId, userId)` — true if caller has `role = OWNER` or `EDITOR` for that deck
  - Every existing endpoint that currently checks `deck.creatorUserId.equals(userId)` updates to `authorizationService.canEditDeck(...)`
- Endpoints (under `DeckController`):
  - `GET    /api/decks/{id}/collaborators` — list
  - `POST   /api/decks/{id}/collaborators` — invite by `userId` or `email`; body `{ userIdOrEmail, role }`
  - `PUT    /api/decks/{id}/collaborators/{userId}` — change role (owner only)
  - `DELETE /api/decks/{id}/collaborators/{userId}` — remove (owner only, or remove self)
  - `POST   /api/decks/{id}/collaborators/transfer` — body `{ userId }`; transfers `OWNER` role
- Migration: for every existing deck, insert one `DeckCollaborator` row with `userId = creatorUserId`, `role = OWNER`, `invitedAt = createdAt`, `acceptedAt = createdAt`
- Invite-by-email: if no user matches, create a row keyed by `email` (add `String email` nullable field) and resolve to `userId` on first login

## Frontend changes

- "Share" button in the deck editor navbar opens a modal
- Modal lists current collaborators with role dropdown, a remove button, and a "Transfer ownership" affordance
- Invite form: email or username input, role dropdown
- Pending invitations show up in a notification (chunk 18) or — for now — on the user's "My Decks" page under a "Shared with me" tab
- Deck card on "Shared with me" shows the role pill

## Cross-cutting concerns

- `DeckRepository.findByCreatorUserId` is used in several places — audit it. Most callers want "decks I can edit," which is now "decks where I'm OWNER or EDITOR."
- Add `DeckRepository.findAllByCollaboratorUserId(userId)` and update the "My Decks" surface to use it.
- Tag chunk 18 (Notifications): emit `NotificationKind.COLLAB_INVITE` when a collaborator is added.

## Checklist

- [x] `DeckCollaborator` model + repo + service + tests
- [x] `CollaboratorRole` enum
- [x] `AuthorizationService.canViewDeck` / `canEditDeck` overhaul + tests
- [x] Migration to backfill OWNER rows for existing decks
- [x] Endpoints + tests
- [x] "My Decks" page shows owned + shared decks, role pill
- [x] Share modal in deck editor
- [x] Transfer ownership flow
- [x] Frontend codegen + lint
- [x] Backend tests pass
