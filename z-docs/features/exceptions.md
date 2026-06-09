# Exception Handling

How the backend turns failures into HTTP responses, what those responses look like on the wire, and how the frontend reads them. The terse, grep-able version of the rules lives in [exception-rules](../rules/exception-rules.md); this doc is the _why_ and _how_ behind them.

---

## The problem

Before this design the backend had **no centralized exception handling**. The de-facto convention was for services and controllers to throw `org.springframework.web.server.ResponseStatusException(status, reason)` — and they did, in 136 places across 30 files. That worked, but left three gaps:

1. **Information leakage.** `application.properties` set `spring.web.error.include-message=always`, so Spring's default `/error` body echoed the reason string back to the client. Any _unhandled_ exception (a `NullPointerException`, a Mongo timeout) fell through to the same default handler and could surface internal detail — class names, stack frames with `include-stacktrace`, raw binding errors — to the browser. There was no generic-500 masking.
2. **Inconsistent shapes.** A `ResponseStatusException` produced one body; a bean-validation failure (`@Valid`) produced Spring's default `MethodArgumentNotValidException` body; a Spring Security `@PreAuthorize` denial produced yet another. The frontend had no single contract to code against.
3. **The frontend couldn't tell cases apart.** RTK Query's `extractErrorMessage` only read `data.message` / `data.error`, and the UI treated everything except `401` as a generic `isError`. `DeckAnalyticsPage` literally rendered _"You don't have permission to view this deck's analytics, **or** the deck doesn't exist"_ — because it had no reliable way to distinguish a `403` from a `404`.

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

Concretely in `AuthorizationService`: `requireInteractiveSessionHost(roomCode, …)` collapses both "no such room" and "you are not the host" into a single `404 SESSION_NOT_FOUND`. Every other `require*` method keeps its honest `404`-then-`403` split.

This decision is what finally lets `DeckAnalyticsPage` split its conflated banner into two distinct messages (see [Frontend contract](#frontend-contract)).

---

## Backend design

### The `ApiException` hierarchy

A thin, typed exception hierarchy lives in a new package, `cephadex.ambi.exception`. These are exceptions, not DTOs, so DTO naming rules don't apply; they sit in their own package rather than `config/` (which holds `@Configuration`) — mirroring how `service/email/provider/` already nests its own `EmailSendException`.

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

A single `@RestControllerAdvice` in the same package, **extending `ResponseEntityExceptionHandler`**. Extending the base class (rather than writing standalone advice) is the key choice: it lets us override the framework's own handlers — `handleMethodArgumentNotValid`, `handleHttpMessageNotReadable`, `handleNoResourceFound`, … — and swap in our ProblemDetail body while reusing all the status/header plumbing. Most-specific handler wins, so our `Throwable` catch-all only fires for genuinely unmapped types.

It handles:

| Source                                                                                   | Maps to                                                                |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `ApiException` (new code)                                                                | its own `status` / `code` / message                                    |
| `ResponseStatusException` (the 130+ existing sites)                                      | `status` + reason; `code` derived from status (`defaultCodeFor`)       |
| `AccessDeniedException` (Spring Security `@PreAuthorize`)                                | `403 FORBIDDEN`                                                        |
| `AuthenticationException`                                                                | `401 UNAUTHORIZED`                                                     |
| `MethodArgumentNotValidException` / `ConstraintViolationException` (validation override) | `400 VALIDATION_FAILED` + `errors[]`                                   |
| `Throwable` (catch-all)                                                                  | `500 INTERNAL_ERROR`, generic detail, full exception logged at `ERROR` |

A shared `decorate(pd, req)` stamps every response with `traceId` + `instance`. `traceId` is read from the SLF4J MDC if present, otherwise generated as a short hex token and written back into the MDC — so any log lines emitted on the same request share the id, and when real distributed tracing lands the handler transparently picks up the propagated id with no change.

### Coexistence — no big-bang refactor

Because the handler maps **both** `ApiException` _and_ `ResponseStatusException`, the two styles coexist indefinitely. The payoff is immediate: once the handler ships, all 136 existing throw-sites already serialize to the new ProblemDetail shape **with zero edits**. The only thing the old sites lack is a _specific_ `code` — a `ResponseStatusException(NOT_FOUND, …)` becomes `code: "NOT_FOUND"`, not `code: "DECK_NOT_FOUND"`.

So migration is **opportunistic**: convert a throw-site to a typed `ApiException` only when the frontend actually wants to branch on its specific code. The first and highest-leverage target is `AuthorizationService` — the single choke point through which deck/theme/session/org/media authorization flows — whose 11 sites become typed in one focused change.

**New rule going forward:** new code throws `ApiException` subclasses, never raw `ResponseStatusException`.

### WebSocket consistency

Interactive-session actions (start, answer, next round, …) travel over STOMP, not HTTP, so they can't use the REST advice. `InteractiveSessionWebSocketController` already has a `@MessageExceptionHandler` that emits an `InteractiveSessionErrorMessage(operation, roomCode, status, message)` to `/user/queue/errors`. It is reconciled to match the REST contract:

- recognizes `ApiException` (reads `status` / `message`) alongside the existing `ResponseStatusException` branch, via a **shared `codeFor(Throwable)` helper** in `exception/` so the status↔code mapping lives in exactly one place;
- applies the same disclosure policy — a cause that is neither `ApiException` nor `ResponseStatusException` becomes `status: 500` with the generic message (it previously logged at `WARN` and leaked `ex.getMessage()`; now `ERROR` + generic);
- gains a `code` field on the message (`InteractiveSessionErrorMessage` is a `Message` DTO, so adding `String code` is compliant) for REST/STOMP parity.

---

## Frontend contract

The frontend changes are deliberately small:

- **`extractErrorMessage`** (`frontend/src/utils/utils.ts`) reads `data.detail` (the ProblemDetail field) first, then falls back to the legacy `data.message` / `data.error` for any not-yet-migrated path. The error data type widens to include `detail?` and `code?`.
- **`baseQuery`** (`frontend/src/store/emptyApi.ts`) needs **no change**: ProblemDetail still sets the HTTP status to `401`, so the existing `status === 401 → authPromptRequested` (login modal + pending-mutation replay) keeps working. Branching on `data.code` is available but optional.
- **`DeckAnalyticsPage`** splits its conflated banner now that the backend distinguishes the cases: `403` → "You don't have access to this deck", `404` → "That deck doesn't exist". This is the concrete payoff of the [tiered 404/403 policy](#404-vs-403-the-disclosure-decision).
- The STOMP error consumer gains the optional `code` field carried by `InteractiveSessionErrorMessage`.
- **Regenerate the OpenAPI client** (`npx @rtk-query/codegen-openapi openapi-config.cts`, backend running) so the ProblemDetail schema is reflected. Never hand-edit `AmbiApi.ts`.

`code` is the stable contract — UI logic should branch on `code` (and `status`), never on the human-readable `detail` string, which may be reworded at any time.

---

## Implementation map

| File                                                                  | Change                                                    |
| --------------------------------------------------------------------- | --------------------------------------------------------- |
| `backend/.../exception/ApiException.java` + 5 subclasses              | new — the typed hierarchy                                 |
| `backend/.../exception/GlobalExceptionHandler.java`                   | new — the `@RestControllerAdvice`                         |
| `backend/src/main/resources/application.properties`                   | the three `spring.web.error.*` properties                 |
| `backend/.../service/AuthorizationService.java`                       | first migration target (11 sites) + room-code 404-masking |
| `backend/.../controller/InteractiveSessionWebSocketController.java`   | reconcile `handleException`; fix the 500 leak             |
| `backend/.../dto/session/message/InteractiveSessionErrorMessage.java` | add `String code`                                         |
| `frontend/src/utils/utils.ts`                                         | `extractErrorMessage` reads `detail`                      |
| `frontend/src/pages/DeckAnalyticsPage/DeckAnalyticsPage.tsx`          | split 403 vs 404 messages                                 |

---

## Testing

- **`GlobalExceptionHandlerTest`** (`@WebMvcTest` with an inline test `@RestController` that throws one exception per branch) asserts: HTTP status, `Content-Type: application/problem+json`, presence of `$.code` / `$.title` / `$.detail` / `$.instance` / `$.traceId`, and the validation `$.errors[*].field`. The **disclosure assertion** is the important one: the `500` body equals the generic string and does **not** contain the thrown exception's message or class name. Tests run under the `test` profile (`SecurityConfig` is `@Profile("!test")`; use `TestSecurityConfig`).
- An `AuthorizationService` unit test asserts `requireDeckEditable` throws `NotFoundException("DECK_NOT_FOUND", …)` / `ForbiddenException("DECK_EDIT_FORBIDDEN", …)`, and that `requireInteractiveSessionHost` returns `404 SESSION_NOT_FOUND` for a non-host (masking verified).
- A WebSocket test asserts the `500` path no longer leaks `ex.getMessage()` and that `ApiException` maps to the correct `status` / `code`.
