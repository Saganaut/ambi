# Exception Handling

How the backend turns failures into HTTP responses, what those responses look like on the wire, and how the frontend reads them. The terse, grep-able version of the rules lives in [exception-rules](../rules/exception-rules.md); this doc is the _why_ and _how_ behind them.

---

## The problem

Before this design the backend had **no centralized exception handling**. The de-facto convention was for services and controllers to throw `org.springframework.web.server.ResponseStatusException(status, reason)` — and they did, in 136 places across 30 files. That worked, but left three gaps:

1. **Information leakage.** `application.properties` set `spring.web.error.include-message=always`, so Spring's default `/error` body echoed the reason string back to the client. Any _unhandled_ exception (a `NullPointerException`, a Mongo timeout) fell through to the same default handler and could surface internal detail — class names, stack frames with `include-stacktrace`, raw binding errors — to the browser. There was no generic-500 masking.
2. **Inconsistent shapes.** A `ResponseStatusException` produced one body; a bean-validation failure (`@Valid`) produced Spring's default `MethodArgumentNotValidException` body; a Spring Security `@PreAuthorize` denial produced yet another. The frontend had no single contract to code against.
3. **The frontend couldn't tell cases apart.** RTK Query's `extractErrorMessage` only read `data.message` / `data.error`, and the UI treated everything except `401` as a generic `isError`. Any page relying on a shared 403/404 banner had no reliable way to distinguish "not allowed" from "doesn't exist".

The goal: **one HTTP-standard error contract** that the frontend can branch on programmatically, that leaks nothing on `5xx`, and that does **not** require rewriting all 136 existing throw-sites in one pass.

---

## The contract: RFC 9457 Problem Details

Every error response is an [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) _Problem Details_ object, served as `application/problem+json`. We use Spring Boot's built-in `org.springframework.http.ProblemDetail` — it is a framework type, **not** a class in `dto/`, so it is exempt from the [DTO naming rules](../rules/naming/dto-naming.md) (which forbid generic envelopes).

We use the five standard members and add three extension members:

| Member        | Standard? | Meaning                                                                                                                                                         |
| ------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`        | RFC       | URI identifying the problem type. We leave it `about:blank` (the default) and rely on `code` instead.                                                           |
| `title`       | RFC       | Short human label for the status, e.g. `"Not Found"`.                                                                                                           |
| `status`      | RFC       | The HTTP status code, mirrored in the body.                                                                                                                     |
| `detail`      | RFC       | Human-readable, **user-safe** explanation. Safe to show in the UI for `4xx`; fixed and generic for `5xx`.                                                       |
| `instance`    | RFC       | The request path that produced the error.                                                                                                                       |
| **`code`**    | extension | **Stable, machine-readable identifier** the frontend branches on — `DECK_NOT_FOUND`, `DECK_EDIT_FORBIDDEN`, `VALIDATION_FAILED`, `INTERNAL_ERROR`, …            |
| **`traceId`** | extension | Short hex token, also written to the server log line for this request. Lets support correlate a user-reported failure with logs **without** exposing internals. |
| **`errors`**  | extension | Validation only. Array of `{ field, message }` for field-level failures.                                                                                        |

### Example responses

**404 — resource not found**

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

**403 — forbidden (honest)**

```json
{
  "type": "about:blank",
  "title": "Forbidden",
  "status": 403,
  "detail": "You do not have edit access to this deck",
  "instance": "/api/decks/abc123",
  "code": "DECK_EDIT_FORBIDDEN",
  "traceId": "b3e1c7d2f9a04e6c"
}
```

**400 — validation failure**

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

**500 — unexpected (nothing leaked)**

```json
{
  "type": "about:blank",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "Something went wrong, please try again.",
  "instance": "/api/decks/abc123",
  "code": "INTERNAL_ERROR",
  "traceId": "b3e1c7d2f9a04e6c"
}
```

---

## Information disclosure policy

The single rule that governs `detail`:

- **`4xx` (client error) → safe to be specific.** The caller did something we want them to be able to fix, so `detail` carries an actionable message. The existing `ResponseStatusException` reasons ("Deck not found", "Only the host can perform this action") are all already user-safe and survive as-is.
- **`5xx` (server error) → say nothing.** `detail` is the fixed string `"Something went wrong, please try again."` — **never** `ex.getMessage()`, never a class name, never a stack frame. The full exception is logged server-side at `ERROR` together with the `traceId`, and forwarded to Sentry once that integration is wired (see [infrastructure](../infrastructure/infrastructure.md); it is documented there but not yet on the classpath, so we generate the `traceId` ourselves for now).

This is reinforced at the framework level in `application.properties`:

```properties
spring.web.error.include-message=never          # was: always — stop the default-path leak
spring.web.error.include-stacktrace=never        # explicit; never flip to on_param
spring.web.error.include-binding-errors=never     # we render our own structured `errors`
```

The default whitelabel `/error` controller stays **enabled** as a last-resort net for failures raised outside Spring MVC dispatch (e.g. in a servlet filter, before `@RestControllerAdvice` can run). With the properties above it returns a minimal, non-leaking body. We deliberately do **not** set `server.error.whitelabel.enabled=false`, which would expose the uglier servlet-container default page instead.

---

## 404 vs 403: the disclosure decision

When an authenticated caller asks for a resource they're **not allowed to see**, the API has a choice:

- **Honest `403`** — "it exists, but you can't touch it." Best UX and debuggability, but it confirms the resource _exists_ to anyone who can guess its id.
- **Mask as `404`** — "as far as you're concerned, there's nothing here." Hides existence entirely, at the cost of a confusing "not found" for a legitimate-but-unauthorized user.

We adopt a **tiered policy** keyed on how guessable the resource's identifier is:

| Resource                            | Key                                | Policy          | Rationale                                                                                                    |
| ----------------------------------- | ---------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------ |
| Decks, themes, organizations, media | random ObjectId / token            | **Honest 403**  | Keys are high-entropy; enumeration is infeasible, so leaking existence costs nothing and the better UX wins. |
| Interactive sessions                | **room code** (short, human-typed) | **Mask as 404** | Room codes are low-entropy and guessable; "does room `ABCD` exist?" is itself sensitive.                     |
| Invites                             | invite token in a shareable link   | **Mask as 404** | An invalid/forbidden token and a non-existent one should be indistinguishable.                               |

A masked response still uses a `*_NOT_FOUND` code (e.g. `SESSION_NOT_FOUND`), never `FORBIDDEN` — so the policy is **greppable and auditable**: searching for a `FORBIDDEN` code on a room-code path is a bug.

Concretely, `LiveSessionHostService.requireHost` / `LiveSessionLobbyService.requireHost` throw a `404 SESSION_NOT_FOUND` when the session doesn't exist, then an honest `403 ForbiddenException("NOT_HOST", …)` when the caller exists but isn't the host — the room-code masking applies at the session-lookup step, not by collapsing "not host" into "not found".

This tiered policy is what lets the frontend split a conflated 403/404 banner into two distinct messages (see [Frontend contract](#frontend-contract)).

---

## Backend design

### The `ApiException` hierarchy

A thin, typed exception hierarchy lives in a dedicated package, `com.cephadex.ambi.common.exception`. These are exceptions, not DTOs, so DTO naming rules don't apply; they sit in their own package rather than `config/` (which holds `@Configuration`) — mirroring how `service/email/provider/` already nests its own `EmailSendException`.

```java
public abstract class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    protected ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
```

Subclasses fix the status and take a `(code, message)` pair so each throw-site can carry a **specific** code:

| Class                   | Status | Example                                                                                              |
| ----------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| `NotFoundException`     | 404    | `new NotFoundException("DECK_NOT_FOUND", "Deck not found")`                                          |
| `ForbiddenException`    | 403    | `new ForbiddenException("DECK_EDIT_FORBIDDEN", "You do not have edit access to this deck")`          |
| `ConflictException`     | 409    | `new ConflictException("ROOM_CODE_IN_USE", "That room code is taken")`                               |
| `UnauthorizedException` | 401    | `new UnauthorizedException("AUTH_REQUIRED", "Sign in to continue")`                                  |
| `ValidationException`   | 400    | `new ValidationException("Deck must have at least one element")` (defaults code `VALIDATION_FAILED`) |

### `GlobalExceptionHandler`

A single `@RestControllerAdvice` in the same package, **extending `ResponseEntityExceptionHandler`**. Extending the base class (rather than writing standalone advice) is the key choice: it lets us override two of the framework's own handlers — `handleMethodArgumentNotValid` (validation) and `handleExceptionInternal` (the catch-all fallback for exceptions the base class already knows how to map) — and swap in our ProblemDetail body while reusing all the status/header plumbing. Most-specific handler wins, so our `Throwable` catch-all only fires for genuinely unmapped types.

It handles:

| Source                                                                                   | Maps to                                                                |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `ApiException` (new code)                                                                | its own `status` / `code` / message                                    |
| `ResponseStatusException` (the legacy sites still in use)                                | `status` + reason; `code` derived from status (`ApiErrors.defaultCodeFor`) |
| `AccessDeniedException` (Spring Security `@PreAuthorize`)                                | `403 FORBIDDEN`                                                        |
| `AuthenticationException`                                                                | `401 UNAUTHORIZED`                                                     |
| `MethodArgumentNotValidException` / `ConstraintViolationException` (validation override) | `400 VALIDATION_FAILED` + `errors[]`                                   |
| `Throwable` (catch-all)                                                                  | `500 INTERNAL_ERROR`, generic detail, full exception logged at `ERROR` |

A shared `decorate(pd, req)` stamps every response with `traceId` + `instance`. `traceId` is read from the SLF4J MDC if present, otherwise generated as a short hex token and written back into the MDC — so any log lines emitted on the same request share the id, and when real distributed tracing lands the handler transparently picks up the propagated id with no change.

### Coexistence — migration is complete

The handler maps **both** `ApiException` _and_ `ResponseStatusException`, so the two styles could coexist during the migration without a big-bang refactor: once the handler shipped, every existing throw-site immediately serialized to the new ProblemDetail shape with zero edits, and the only thing an unmigrated site lacked was a _specific_ `code` (a `ResponseStatusException(NOT_FOUND, …)` becomes `code: "NOT_FOUND"`, not `code: "DECK_NOT_FOUND"`).

That migration is now essentially done: 22+ files throw typed `ApiException` subclasses, and only 3 references to `ResponseStatusException` remain in the codebase — the `import`, the legacy `@ExceptionHandler` branch, and a doc comment, all inside `GlobalExceptionHandler.java` / `ApiException.java` themselves. The legacy branch stays wired up as a safety net, but there are no longer any live throw-sites depending on it.

**Rule going forward:** new code throws `ApiException` subclasses, never raw `ResponseStatusException`.

### WebSocket note

Interactive-session actions (start, answer, next round, …) are plain REST endpoints on `LiveSessionController` (`/api/liveSessions/{id}/...`) and go through the same `GlobalExceptionHandler` as everything else. The only STOMP-related class, `LiveSessionStompRelay`, is a one-way broadcaster (Redis pub/sub → `/topic/...`) with no exception handling of its own — there is no `@MessageExceptionHandler` or WebSocket-specific error contract to reconcile.

---

## Frontend contract

The frontend changes are deliberately small:

- **`extractErrorMessage`** (`frontend/src/shared/utils/utils.ts`) reads `data.detail` (the ProblemDetail field) first, then falls back to the legacy `data.message` / `data.error` for any not-yet-migrated path. The error data type widens to include `detail?` and `code?`.
- **`baseQuery`** (`frontend/src/shared/store/emptyApi.ts`) needs **no change**: ProblemDetail still sets the HTTP status to `401`, so the existing `status === 401 → authPromptRequested` (login modal + pending-mutation replay) keeps working. Branching on `data.code` is available but optional.
- Pages that previously showed a conflated 403/404 banner can now split it now that the backend distinguishes the cases: `403` → "You don't have access", `404` → "That doesn't exist". This is the concrete payoff of the [tiered 404/403 policy](#404-vs-403-the-disclosure-decision).
- **Regenerate the OpenAPI client** (`npx @rtk-query/codegen-openapi openapi-config.cts`, backend running) so the ProblemDetail schema is reflected in the generated types.

`code` is the stable contract — UI logic should branch on `code` (and `status`), never on the human-readable `detail` string, which may be reworded at any time.

---

## Implementation map

| File                                                                        | Change                                     |
| ---------------------------------------------------------------------------- | ------------------------------------------ |
| `backend/src/main/java/com/cephadex/ambi/common/exception/ApiException.java` + 5 subclasses | the typed hierarchy                        |
| `backend/src/main/java/com/cephadex/ambi/common/exception/ApiErrors.java`   | `defaultCodeFor(HttpStatusCode)` helper    |
| `backend/src/main/java/com/cephadex/ambi/common/exception/GlobalExceptionHandler.java` | the `@RestControllerAdvice`                |
| `backend/src/main/resources/application.properties`                         | the three `spring.web.error.*` properties  |
| `backend/.../session/LiveSessionHostService.java` / `LiveSessionLobbyService.java` | typed `requireHost` (404-then-403)   |
| `frontend/src/shared/utils/utils.ts`                                         | `extractErrorMessage` reads `detail`       |
| `frontend/src/shared/store/emptyApi.ts`                                     | `baseQuery` (no change needed)             |
