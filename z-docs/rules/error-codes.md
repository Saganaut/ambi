# Error Codes

The registry of every `code` used in an `ApiException` (see [exception-rules](exception-rules.md)), plus the naming convention for new ones.

**Before adding a new code:** check the registry for one that already fits — reuse beats a near-duplicate. If nothing fits, follow the shapes below and add a row here **in the same commit**.

---

## Naming shapes

| Status | Shape | Example |
| --- | --- | --- |
| 404 | `{RESOURCE}_NOT_FOUND` | `DECK_NOT_FOUND` |
| 403 | `{RESOURCE}_{ACTION}_FORBIDDEN`, action one of `VIEW` / `EDIT` / `MANAGE` | `DECK_EDIT_FORBIDDEN` |
| 403 | Role/relationship violation — no fixed template; must name a specific reason | `NOT_HOST`, `COMMENT_FORBIDDEN` |
| 409 | Free-form state description — no shared template | `ROOM_CODE_UNAVAILABLE`, `EMAIL_TAKEN` |
| 401 | `AUTH_REQUIRED` for "no signed-in principal"; a specific credential failure gets its own code | `AUTH_REQUIRED`, `REFRESH_FAILED` |
| 400 | Always `VALIDATION_FAILED`, hardcoded by `ValidationException` | `VALIDATION_FAILED` |

All codes are `SCREAMING_SNAKE_CASE`. Scope by resource where the resource is the point of the check (`DECK_NOT_FOUND`, not `NOT_FOUND`); don't scope where the condition is caller-relative (`NOT_HOST`, not `SESSION_HOST_FORBIDDEN`).

A masked 404 still uses a `*_NOT_FOUND` code — see [exception-rules.md](exception-rules.md) §5.

---

## Registry

### 401 — `UnauthorizedException`

| Code | Meaning | Thrown from |
| --- | --- | --- |
| `AUTH_REQUIRED` | No signed-in principal (the canonical "you must be logged in" check) | `AmbiPrincipals.requireUserId`, and every controller/service that needs a caller id |
| `REFRESH_TOKEN_MISSING` | No refresh-token cookie on the request | `AuthController` |
| `REFRESH_FAILED` | Refresh token present but invalid or expired | `AuthService` |
| `REFRESH_USER_GONE` | Refresh token valid, but its backing user no longer exists | `AuthService` |
| `WORKER_AUTH_FAILED` | Internal worker callback presented a missing or wrong shared secret | `WorkerCallbackAuthenticator` |

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
| `GALLERY_IMAGE_NOT_FOUND` | Image id doesn't resolve within a gallery — also "there is no file here" on the same-origin byte reads, when the stored object behind a resolvable reference is gone (`GalleryController`'s `/file` route, `OpaqueImageController`) |
| `COMMENT_NOT_FOUND` | Comment id doesn't resolve |
| `COMMENT_THREAD_NOT_FOUND` | Comment thread id doesn't resolve |
| `USER_NOT_FOUND` | User id doesn't resolve |
| `QUESTION_NOT_FOUND` | Q&A question id doesn't resolve within the round |
| `VOTE_OPTION_NOT_FOUND` | Voted option id isn't one of the round's minted options |

### 409 — `ConflictException`

| Code | Meaning |
| --- | --- |
| `FOLLOW_UP_EXISTS` | Slide already has a follow-up slide |
| `THEME_ID_RESERVED` | Theme create used an id reserved for a client-side default theme (`ambi-light` / `ambi-dark`) |
| `SESSION_NOT_LIVE` | Action requires a live session, but it isn't live |
| `SESSION_NOT_IN_LOBBY` | Action requires the session to be in the lobby stage |
| `HOST_CANNOT_LEAVE` | Host attempted to leave their own session |
| `ROUND_NOT_OPEN` | Action requires an open round |
| `ROUND_NOT_CURRENT` | Action names a slide that isn't the session's current round |
| `ROUND_NOT_TIMED` | Timer pause/resume on a round with no auto-close timer |
| `QUESTION_LIMIT_REACHED` | Participant hit the Q&A round's per-player question cap |
| `ROUND_ALREADY_SCORED` | Round has already been scored |
| `ROUND_ALREADY_OPEN` | Round is already open |
| `ROUND_ALREADY_CLOSED` | Voting can't open on a round that's already closed (and thus already scored) |
| `NO_VOTABLE_SUBMISSIONS` | Voting can't open — no submission of the round qualifies as a votable option |
| `VOTING_NOT_OPEN` | Vote submitted for a slide that isn't currently collecting votes |
| `CANNOT_VOTE_FOR_OWN_ANSWER` | Caller tried to vote for their own submission |
| `PARENT_ROUND_NOT_SCORED` | A follow-up round's parent round isn't scored yet |
| `FOLLOW_UP_NOT_PLAYABLE` | A follow-up the host named mints no board from its parent round's submissions |
| `REVEAL_BLOCKED_BY_FOLLOW_UP` | Results reveal on a slide whose attached follow-up round presents them instead |
| `SESSION_ALREADY_TERMINAL` | Session has already ended |
| `SESSION_FULL` | Session's roster is at its cap (deck `AudienceSettings.maxParticipants`, default 200) |
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
