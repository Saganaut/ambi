# Exception Handling Rules

Mechanical rules for how the backend produces errors. The full design and rationale live in [features/exceptions.md](../features/exceptions.md) — read that first if you're new to the system. This file is the checklist.

---

## 1. Every error is an RFC 9457 `ProblemDetail`

Use Spring's `org.springframework.http.ProblemDetail` (`application/problem+json`). Never invent a custom error envelope in `dto/` — `ProblemDetail` is a framework type and is exempt from the [DTO naming rules](DTO-NAMING-RULES.md). The body carries the five standard members (`type`, `title`, `status`, `detail`, `instance`) plus three extensions:

- **`code`** — stable, machine-readable id (`DECK_NOT_FOUND`, `VALIDATION_FAILED`, …). Clients branch on this.
- **`traceId`** — short hex token, also in the server log line.
- **`errors`** — validation only; `[{ field, message }]`.

## 2. Throw `ApiException`, never raw `ResponseStatusException`

New code throws a typed subclass from `cephadex.brainflex.exception`:

| Throw | Status |
| ----- | ------ |
| `NotFoundException(code, msg)`     | 404 |
| `ForbiddenException(code, msg)`    | 403 |
| `ConflictException(code, msg)`     | 409 |
| `UnauthorizedException(code, msg)` | 401 |
| `ValidationException(msg)`         | 400 (`VALIDATION_FAILED`) |

`ResponseStatusException` still works — `GlobalExceptionHandler` maps it too, so legacy throw-sites are valid — but it can only yield a status-derived `code` (`NOT_FOUND`, never `DECK_NOT_FOUND`). Don't add new ones.

## 3. `code` is the contract, not `detail`

Pick a `SCREAMING_SNAKE_CASE` code that names the *specific* condition, scoped by resource where it helps the client (`DECK_NOT_FOUND`, `DECK_EDIT_FORBIDDEN`, `ROOM_CODE_IN_USE`). Frontend logic branches on `code` (and `status`). The `detail` string is human-facing and may be reworded anytime — never branch on it.

## 4. Disclosure: `4xx` specific, `5xx` silent

- **`4xx`** → `detail` is a safe, actionable, user-facing message.
- **`5xx`** → `detail` is the fixed `"Something went wrong, please try again."` Never put `ex.getMessage()`, a class name, or a stack frame in a `5xx` body. Log the full exception at `ERROR` with the `traceId` instead.

Never weaken these `application.properties` lines:

```properties
spring.web.error.include-message=never
spring.web.error.include-stacktrace=never
spring.web.error.include-binding-errors=never
```

## 5. 404 vs 403 — tiered by key guessability

| Resource | Unauthorized access returns |
| -------- | --------------------------- |
| Decks, themes, organizations, media (random-id keys) | **Honest 403** |
| Interactive sessions (room code), invites (token) | **Masked 404** |

A masked response uses a `*_NOT_FOUND` code, never `FORBIDDEN`. A `FORBIDDEN` code on a room-code or invite-token path is a bug.

## 6. One handler, one place

All REST error mapping lives in `GlobalExceptionHandler` (`@RestControllerAdvice extends ResponseEntityExceptionHandler`). Don't add `@ExceptionHandler` methods to individual controllers. The STOMP path (`InteractiveSessionWebSocketController.handleException`) shares the same `codeFor` helper and the same disclosure policy.

## 7. Validation

Bean-validation failures (`@Valid`) are handled centrally and produce `400 VALIDATION_FAILED` with the `errors[]` array. Don't catch `MethodArgumentNotValidException` yourself.
