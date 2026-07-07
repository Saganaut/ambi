# Error Codes

The registry of every `code` used in an `ApiException` (see [exception-rules](exception-rules.md) / [features/exceptions.md](../features/exceptions.md)), plus the naming convention for adding new ones. `code` is the stable, machine-readable contract the frontend branches on — this file exists so a new throw-site reuses an existing code instead of minting a near-duplicate.

**Before adding a new code:** check this table for one that already fits. Reuse beats a new, slightly-differently-worded code for the same condition. If nothing fits, add one following the shapes below and add a row here in the same commit.

---

## Naming shapes

| Status | Shape | Example |
| --- | --- | --- |
| 404 | `{RESOURCE}_NOT_FOUND` | `DECK_NOT_FOUND` |
| 403 | `{RESOURCE}_{ACTION}_FORBIDDEN`, action one of `VIEW` / `EDIT` / `MANAGE` | `DECK_EDIT_FORBIDDEN` |
| 403 | Role/relationship violation that isn't a resource+action check — no fixed template, but must read as a specific reason, not a generic denial | `NOT_HOST`, `COMMENT_FORBIDDEN` |
| 409 | Free-form state description — conflicts are inherently state-specific, so there's no shared template. Still `SCREAMING_SNAKE_CASE`, still reused for the exact same condition everywhere it recurs | `ROOM_CODE_UNAVAILABLE`, `EMAIL_TAKEN` |
| 401 | Exactly one code for "no signed-in principal": `AUTH_REQUIRED`. Anything more specific about *why* the credential failed gets its own code (see below) | `AUTH_REQUIRED`, `REFRESH_FAILED` |
| 400 | Fixed at `VALIDATION_FAILED`, hardcoded by `ValidationException`. Never pass a different code to it | `VALIDATION_FAILED` |

All codes are `SCREAMING_SNAKE_CASE`. Scope by resource where the resource is the point of the check (`DECK_NOT_FOUND`, not `NOT_FOUND`); don't scope where the condition is inherently caller-relative rather than resource-relative (`NOT_HOST`, not `SESSION_HOST_FORBIDDEN` — the deciding fact is "you aren't the host," not an action on the session).

A masked 404 (see the [404-vs-403 disclosure policy](../features/exceptions.md#404-vs-403-the-disclosure-decision)) still uses a `*_NOT_FOUND` code, never a `FORBIDDEN` one — a `FORBIDDEN` code on a room-code or invite-token path is a bug.

---

## Registry

### 401 — `UnauthorizedException`

| Code | Meaning | Thrown from |
| --- | --- | --- |
| `AUTH_REQUIRED` | No signed-in principal (the canonical "you must be logged in" check) | `AmbiPrincipals.requireUserId`, and every controller/service that needs a caller id |
| `REFRESH_TOKEN_MISSING` | No refresh-token cookie on the request | `AuthController` |
| `REFRESH_FAILED` | Refresh token present but invalid or expired | `AuthService` |
| `REFRESH_USER_GONE` | Refresh token valid, but its backing user no longer exists | `AuthService` |

### 403 — `ForbiddenException`

Resource + action:

| Code | Meaning |
| --- | --- |
| `DECK_VIEW_FORBIDDEN` / `DECK_EDIT_FORBIDDEN` / `DECK_MANAGE_FORBIDDEN` | Caller lacks the given permission tier on a deck |
| `THEME_VIEW_FORBIDDEN` / `THEME_MANAGE_FORBIDDEN` | Caller lacks the given permission tier on a theme |
| `GALLERY_VIEW_FORBIDDEN` / `GALLERY_EDIT_FORBIDDEN` / `GALLERY_MANAGE_FORBIDDEN` | Caller lacks the given permission tier on a gallery |

Role/relationship violation:

| Code | Meaning | Thrown from |
| --- | --- | --- |
| `NOT_HOST` | Caller isn't the interactive session's host | `LiveSessionHostService`, `LiveSessionLobbyService` |
| `NOT_A_PARTICIPANT` | Caller isn't a participant in the interactive session | `LiveSessionOrchestrator`, `ParticipantResolver` |
| `ANONYMOUS_NOT_ALLOWED` | Action requires a registered principal; caller is a guest | `LiveSessionAnswerService` |
| `REGISTRATION_NOT_ALLOWED` | Registration is disabled/blocked for this caller | `AuthService` |
| `COMMENT_FORBIDDEN` | Caller isn't the comment's author | `CommentThreadService` |
| `REVIEW_SELF_FORBIDDEN` | Caller can't review their own deck | `DeckReviewService` |

### 404 — `NotFoundException`

| Code | Meaning |
| --- | --- |
| `DECK_NOT_FOUND` | Deck id doesn't resolve |
| `SLIDE_NOT_FOUND` | Slide id doesn't resolve within a deck |
| `THEME_NOT_FOUND` | Theme id doesn't resolve |
| `SESSION_NOT_FOUND` | Room code doesn't resolve to a live session — also the masking code used when a room-code path's real failure is authorization (see the disclosure policy) |
| `PARTICIPANT_NOT_FOUND` | Participant id doesn't resolve within a session |
| `GALLERY_NOT_FOUND` | Gallery id doesn't resolve |
| `GALLERY_IMAGE_NOT_FOUND` | Image id doesn't resolve within a gallery |
| `COMMENT_NOT_FOUND` | Comment id doesn't resolve |
| `COMMENT_THREAD_NOT_FOUND` | Comment thread id doesn't resolve |
| `USER_NOT_FOUND` | User id doesn't resolve |
| `QUESTION_NOT_FOUND` | Q&A question id doesn't resolve within the round |

### 409 — `ConflictException`

| Code | Meaning |
| --- | --- |
| `FOLLOW_UP_EXISTS` | Slide already has a follow-up slide |
| `SESSION_NOT_LIVE` | Action requires a live session, but it isn't live |
| `SESSION_NOT_IN_LOBBY` | Action requires the session to be in the lobby stage |
| `HOST_CANNOT_LEAVE` | Host attempted to leave their own session |
| `ROUND_NOT_OPEN` | Action requires an open round |
| `QUESTION_LIMIT_REACHED` | Participant hit the Q&A round's per-player question cap |
| `ROUND_ALREADY_SCORED` | Round has already been scored |
| `ROUND_ALREADY_OPEN` | Round is already open |
| `PARENT_ROUND_NOT_SCORED` | A follow-up round's parent round isn't scored yet |
| `SESSION_ALREADY_TERMINAL` | Session has already ended |
| `ROOM_CODE_UNAVAILABLE` | Requested room code is already in use |
| `SESSION_LOCKED` | Session is locked by a concurrent operation (Redis lock contention) |
| `REGISTRATION_RACE` | Concurrent registration attempts collided |
| `EMAIL_TAKEN` | Email already belongs to another account |
| `USERNAME_TAKEN` | Username already belongs to another account |
| `GUEST_CREATE_FAILED` | Guest account creation failed |

### 400 — `ValidationException`

| Code | Meaning |
| --- | --- |
| `VALIDATION_FAILED` | Bean-validation (`@Valid`) or hand-thrown validation failure; carries `errors[]` |

---

## Legacy `ResponseStatusException` sites

Sites not yet migrated to `ApiException` get a status-derived code (`NOT_FOUND`, `FORBIDDEN`, …) via `GlobalExceptionHandler`'s `defaultCodeFor`, not a specific one from this table. Don't add a specific code to a `ResponseStatusException` call — migrate the site to the matching `ApiException` subclass instead, using or adding a registry code.
