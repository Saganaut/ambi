# Exception Handling

How the backend turns failures into HTTP responses, what those responses look
like on the wire, and how the frontend reads them. The terse, grep-able version
of the rules lives in [exception-rules](../rules/exception-rules.md); this doc
is the _why_ and _how_ behind them.

## The contract: RFC 9457 Problem Details

Every error response is an [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)
_Problem Details_ object, served as `application/problem+json`. We use Spring
Boot's built-in `org.springframework.http.ProblemDetail` — a framework type,
**not** a class in `dto/`, so it is exempt from the
[DTO naming rules](../rules/naming/dto-naming.md) that forbid generic envelopes.

Five standard members plus three extensions:

| Member | Standard? | Meaning |
|---|---|---|
| `type` | RFC | URI identifying the problem type. Left `about:blank`; we rely on `code` instead. |
| `title` | RFC | Short human label for the status, e.g. `"Not Found"`. |
| `status` | RFC | The HTTP status, mirrored in the body. |
| `detail` | RFC | Human-readable, **user-safe** explanation. Specific for `4xx`; fixed and generic for `5xx`. |
| `instance` | RFC | The request path that produced the error. |
| **`code`** | extension | **Stable, machine-readable identifier** the frontend branches on — `DECK_NOT_FOUND`, `DECK_EDIT_FORBIDDEN`, `VALIDATION_FAILED`, `INTERNAL_ERROR`, … |
| **`traceId`** | extension | Short hex token, also written to this request's server log line. Lets support correlate a user-reported failure with logs **without** exposing internals. |
| **`errors`** | extension | Validation only. Array of `{ field, message }` for field-level failures. |

Every new code needs its row in
[`z-docs/rules/error-codes.md`](../rules/error-codes.md) **in the same commit**.

**404 — resource not found:**

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "Deck not found",
  "instance": "/api/decks/abc123",
  "code": "DECK_NOT_FOUND",
  "traceId": "b3e1c7d2f9a04e6c"
}
```

**400 — validation failure** (the only shape that carries `errors`):

```json
{
  "type": "about:blank",
  "title": "Validation Failed",
  "status": 400,
  "detail": "Request validation failed",
  "instance": "/api/decks",
  "code": "VALIDATION_FAILED",
  "traceId": "b3e1c7d2f9a04e6c",
  "errors": [
    { "field": "name", "message": "must not be blank" },
    { "field": "elements", "message": "size must be between 1 and 100" }
  ]
}
```

## Information disclosure policy

One rule governs `detail`:

- **`4xx` → safe to be specific.** The caller did something we want them to be able to fix, so `detail` carries an actionable message.
- **`5xx` → say nothing.** `detail` is the fixed string `"Something went wrong, please try again."` — **never** `ex.getMessage()`, never a class name, never a stack frame. The full exception is logged server-side at `ERROR` with the `traceId`, and will forward to Sentry once that integration is wired (see [infrastructure](../infrastructure/infrastructure.md); documented but not yet on the classpath, so we generate the `traceId` ourselves for now).

Reinforced at the framework level in `application.properties`:

```properties
spring.web.error.include-message=never
spring.web.error.include-stacktrace=never
spring.web.error.include-binding-errors=never
```

The default whitelabel `/error` controller stays **enabled** as a last-resort
net for failures raised outside Spring MVC dispatch (a servlet filter, before
`@RestControllerAdvice` can run). With the properties above it returns a
minimal, non-leaking body. We deliberately do **not** set
`server.error.whitelabel.enabled=false`, which would expose the uglier servlet
container default page instead.

## 404 vs 403: the disclosure decision

When an authenticated caller asks for a resource they're not allowed to see, an
honest `403` is the better UX but confirms the resource _exists_ to anyone who
can guess its id. We adopt a **tiered policy** keyed on how guessable the
identifier is:

| Resource | Key | Policy | Rationale |
|---|---|---|---|
| Decks, themes, organizations, media | random ObjectId / token | **Honest 403** | High-entropy keys; enumeration is infeasible, so leaking existence costs nothing and the better UX wins. |
| Interactive sessions | **room code** (short, human-typed) | **Mask as 404** | Room codes are low-entropy and guessable; "does room `ABCD` exist?" is itself sensitive. |
| Invites | invite token in a shareable link | **Mask as 404** | An invalid/forbidden token and a non-existent one should be indistinguishable. |

A masked response still uses a `*_NOT_FOUND` code (e.g. `SESSION_NOT_FOUND`),
never `FORBIDDEN` — so the policy is **greppable and auditable**: a `FORBIDDEN`
code on a room-code path is a bug.

Concretely, `LiveSessionHostService.requireHost` /
`LiveSessionLobbyService.requireHost` throw `404 SESSION_NOT_FOUND` when the
session doesn't exist, then an honest `403 ForbiddenException("NOT_HOST", …)`
when the caller exists but isn't the host — the masking applies at the
session-lookup step, not by collapsing "not host" into "not found".

## Backend design

The typed hierarchy lives in `com.cephadex.ambi.common.exception`. `ApiException`
is an abstract `RuntimeException` carrying a `HttpStatus` and a `String code`;
each subclass fixes the status and takes a `(code, message)` pair so every
throw-site can carry a **specific** code:

| Class | Status | Example |
|---|---|---|
| `NotFoundException` | 404 | `new NotFoundException("DECK_NOT_FOUND", "Deck not found")` |
| `ForbiddenException` | 403 | `new ForbiddenException("DECK_EDIT_FORBIDDEN", "You do not have edit access to this deck")` |
| `ConflictException` | 409 | `new ConflictException("ROOM_CODE_IN_USE", "That room code is taken")` |
| `UnauthorizedException` | 401 | `new UnauthorizedException("AUTH_REQUIRED", "Sign in to continue")` |
| `ValidationException` | 400 | `new ValidationException("Deck must have at least one element")` — defaults code `VALIDATION_FAILED` |

`GlobalExceptionHandler` is a single `@RestControllerAdvice` in the same
package, **extending `ResponseEntityExceptionHandler`**. Extending the base
class rather than writing standalone advice is the key choice: it lets us
override two of the framework's own handlers — `handleMethodArgumentNotValid`
and `handleExceptionInternal` — and swap in our ProblemDetail body while
reusing all the status/header plumbing. Most-specific handler wins, so the
`Throwable` catch-all only fires for genuinely unmapped types.

| Source | Maps to |
|---|---|
| `ApiException` | its own `status` / `code` / message |
| `ResponseStatusException` (legacy safety net) | `status` + reason; `code` derived from status via `ApiErrors.defaultCodeFor` |
| `AccessDeniedException` (Spring Security `@PreAuthorize`) | `403 FORBIDDEN` |
| `AuthenticationException` | `401 UNAUTHORIZED` |
| `MethodArgumentNotValidException` / `ConstraintViolationException` | `400 VALIDATION_FAILED` + `errors[]` |
| `Throwable` (catch-all) | `500 INTERNAL_ERROR`, generic detail, full exception logged at `ERROR` |

A shared `decorate(pd, req)` stamps every response with `traceId` + `instance`.
`traceId` is read from the SLF4J MDC if present, otherwise generated as a short
hex token and written back into the MDC — so log lines from the same request
share the id, and when real distributed tracing lands the handler picks up the
propagated id with no change.

**The migration off `ResponseStatusException` is complete.** 23 files throw
typed `ApiException` subclasses, and the 7 remaining `ResponseStatusException`
references are confined to the exception package itself
(`GlobalExceptionHandler.java`, `ApiException.java`, `ApiErrors.java`) — the
import, the legacy handler branch, and doc comments. There are no live
throw-sites; the branch stays wired as a safety net.

**Rule going forward:** new code throws `ApiException` subclasses, never raw
`ResponseStatusException`.

### WebSocket note

Live-session actions (start, answer, next round, …) are plain REST endpoints on
`LiveSessionController` and go through the same handler as everything else. The
only STOMP class, `LiveSessionStompRelay`, is a one-way broadcaster (Redis
pub/sub → `/topic/…`) with no exception handling of its own — there is no
`@MessageExceptionHandler` or WebSocket-specific error contract to reconcile.

## Frontend contract

- **`extractErrorMessage`** (`shared/utils/utils.ts`) reads `data.detail` first, falling back to the legacy `data.message` / `data.error`. The error data type includes `detail?` and `code?`.
- **`baseQuery`** (`shared/store/emptyApi.ts`) needs no change: ProblemDetail still sets HTTP status `401`, so the existing `status === 401 → authPromptRequested` (login modal + pending-mutation replay) keeps working. Branching on `data.code` is available but optional.
- Pages that previously showed a conflated 403/404 banner can now split it — `403` → "You don't have access", `404` → "That doesn't exist". That is the concrete payoff of the tiered policy above.

`code` is the stable contract — UI logic branches on `code` (and `status`),
never on the human-readable `detail`, which may be reworded at any time.
