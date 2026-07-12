# Exception Handling Rules

How the backend produces errors. Full design and rationale: [features/exceptions.md](../features/exceptions.md) — read that first if you're new to the system; this file is the checklist.

1. **Every error is an RFC 9457 `ProblemDetail`** — Use Spring's `ProblemDetail` (`application/problem+json`); never invent a custom error envelope (it's a framework type, exempt from the [DTO naming rules](naming-rules.md)). It carries the five standard members plus three extensions: `code` (stable machine id clients branch on), `traceId` (short hex, also in the log line), and `errors` (validation only — `[{ field, message }]`).

2. **Throw `ApiException`, never raw `ResponseStatusException`** — New code throws a typed subclass from `com.cephadex.ambi.common.exception`. `ResponseStatusException` is still mapped for legacy sites but only yields a status-derived `code` — don't add new ones.

   | Throw                              | Status                    |
   | ---------------------------------- | ------------------------- |
   | `NotFoundException(code, msg)`     | 404                       |
   | `ForbiddenException(code, msg)`    | 403                       |
   | `ConflictException(code, msg)`     | 409                       |
   | `UnauthorizedException(code, msg)` | 401                       |
   | `ValidationException(msg)`         | 400 (`VALIDATION_FAILED`) |

3. **`code` is the contract, not `detail`** — Pick a `SCREAMING_SNAKE_CASE` code naming the specific condition, scoped by resource where it helps (`DECK_NOT_FOUND`, `DECK_EDIT_FORBIDDEN`). Frontend branches on `code` (and `status`); `detail` is human-facing and may be reworded anytime — never branch on it. The full registry of codes in use, and the naming shapes for new ones, lives in [error-codes.md](error-codes.md) — check it before minting a new code.

4. **Disclosure: `4xx` specific, `5xx` silent** — `4xx` → `detail` is a safe, actionable user-facing message. `5xx` → `detail` is the fixed `"Something went wrong, please try again."`; never expose `ex.getMessage()`, a class name, or a stack frame — log the full exception at `ERROR` with the `traceId`. Never weaken the `spring.web.error.include-*=never` properties.

5. **404 vs 403 — tiered by key guessability** — Random-id resources (decks, themes, organizations, media) return an **honest 403** on unauthorized access. Guessable-key resources (interactive sessions by room code, invites by token) return a **masked 404** with a `*_NOT_FOUND` code. A `FORBIDDEN` code on a room-code or invite-token path is a bug.

6. **One handler, one place** — All REST error mapping lives in `GlobalExceptionHandler` (`@RestControllerAdvice`). Don't add `@ExceptionHandler` methods to individual controllers.

7. **Validation** — `@Valid` failures are handled centrally into `400 VALIDATION_FAILED` with the `errors[]` array. Don't catch `MethodArgumentNotValidException` yourself.
