# DTO Naming Rules

Strict, mechanical rules for naming classes in `backend/src/main/java/cephadex/ambi/dto/`.

The point of strictness is to **remove judgment**. Two engineers reading the rules should agree on what to name a new class without a debate. If a rule below ever requires a judgment call, it has failed.

---

## 1. Suffix per category — exactly one

Every class in `dto/` MUST end in exactly one of these suffixes:

| Suffix     | Direction | Purpose                                                                                                                                  | Examples                                                                                                 |
| ---------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Request`  | Inbound   | Any payload the client sends — POST/PUT/PATCH bodies _and_ GET filter/query-param objects                                                | `CreateDeckRequest`, `JoinInteractiveSessionRequest`, `DeckExploreRequest`                               |
| `Response` | Outbound  | Anything the server returns over HTTP — resource reads _and_ action result envelopes                                                     | `DeckResponse`, `OrganizationResponse`, `RedeemInviteResponse`, `HealthCheckResponse`                    |
| `Page<T>`  | Outbound  | Paginated list envelope. Use the generic `Page<T>` directly. Only subclass when the endpoint adds summary fields beyond the page itself. | `Page<DeckResponse>` (typical), `DeckRatingsPage` (adds histogram), `UserAchievementsPage` (adds counts) |
| `Message`  | Outbound  | WebSocket / STOMP broadcast payload. Never used for HTTP responses.                                                                      | `RoundStartMessage`, `PresenceMessage`, `AnswerProgressMessage`                                          |

There is no `*DTO` suffix. There is no `*Query` suffix. There is no `*View`, `*Info`, `*Result`, `*Envelope`, or no-suffix class. If a class doesn't fit one of the four categories above, the design is wrong — not the rule.

### Why `Response` instead of `DTO` for read shapes

`Response` pairs symmetrically with `Request` and tells the reader the direction of the data. `DTO` is informationally redundant when the package is already named `dto/`. Splitting outbound shapes into `*DTO` (resource read) vs `*Response` (action envelope) requires a judgment call every time and inevitably drifts — every codebase that tries this ends up inconsistent within a year.

---

## 2. Records, not classes

Every type in `dto/` MUST be a `public record`. No `class`, no `@Data` / `@Value` Lombok wrappers, no abstract base classes.

Records make immutability and equality free, force you to think about field order, and play well with Jackson and SpringDoc out of the box.

---

## 3. One type per file

Each `.java` file in `dto/` MUST declare exactly one top-level public type. No inner records, no sibling records sharing a file, no class-wrapper-around-records pattern.

If two records are tightly related (e.g. `CreateTagRequest` and `UpdateTagRequest`), they each get their own file. Grouping discoverability comes from naming, not file co-location.

---

## 4. No generic envelope types

Do not introduce reusable generic wrappers like `ValueRequest<T>`, `Wrapper<T>`, `Envelope<T>`, etc.

The only generic permitted is `Page<T>` for pagination. Everywhere else, write a named record per use site — `RenameDeckRequest(String name)` is clearer than `ValueRequest<String>` and costs three lines.

---

## 5. Pagination — prefer `Page<T>` directly

Most paginated endpoints should return `Page<DeckResponse>` (or whatever the item type is) directly. Only introduce a named `*Page` subclass when the endpoint genuinely needs extra summary fields alongside the page (e.g. a histogram, aggregate counts).

A named `*Page` subclass that adds nothing beyond `Page<T>` is forbidden — it's pure boilerplate.

---

## 6. Action results are `Response`, not `Result` or `Outcome`

When an endpoint performs an action and returns a small confirmation envelope (e.g. `POST /api/decks/{id}/favorite` → `{ deckId, isFavorited, count }`), name it `FooResponse` (`DeckFavoriteResponse`). Do not invent new suffixes (`Result`, `Outcome`, `Confirmation`) for this case.

---

## 7. Query objects are `Request`

A class bound from `@RequestParam` for a GET endpoint (filters, sort, search params) is named `*Request`, same as a write body. There is one inbound suffix.

---

## 8. WebSocket payloads are `Message`

Server-to-client STOMP broadcasts use `Message`. Do not use `Event`, `Update`, or `Notification` as the suffix even when the message represents an event. `Message` covers all of it.

(Client-to-server STOMP messages, if any, would be `Request` — but the current design has no such case.)

---

## 9. Nested component records still take a suffix

Some records are never a top-level wire root — they exist only as a field inside another payload, often a per-row shape reused across several parents. They still live in `dto/`, still get their own file (§3), and still MUST end in one of the four suffixes.

Choose the suffix from the **direction the data flows**, not from where the record is embedded:

- Embedded only in outbound payloads (`Response` and/or `Message`) → `Response`. This is the common case: the record is server-produced data the client reads.
- Embedded only in inbound payloads → `Request`.

A record shared across both a `Message` and a `Response` is still outbound, so it is `Response` — the broadcast-vs-HTTP split does not change the direction. `PlayerRoundResponse` is the canonical example: it is embedded in both `RoundResultMessage` (a broadcast) and `InteractiveSessionReviewResponse` (an HTTP read), and takes `Response` because both are outbound.

Do not invent a suffix-less "component", "row", or "detail" type to dodge this. A nested record you are tempted to call `PlayerRoundResult` or `RoundDetail` is outbound data and takes `Response`.

---

## Quick decision table

| You are creating…                                                     | Suffix                                                    |
| --------------------------------------------------------------------- | --------------------------------------------------------- |
| A JSON body for a POST/PUT/PATCH                                      | `Request`                                                 |
| A `@RequestParam`-bound query object on a GET                         | `Request`                                                 |
| The JSON returned by any HTTP endpoint                                | `Response`                                                |
| A paginated list (no extra fields)                                    | `Page<XxxResponse>`                                       |
| A paginated list with summary fields                                  | `XxxPage extends Page<…>` (or new record)                 |
| A STOMP/WebSocket broadcast payload                                   | `Message`                                                 |
| A record embedded only inside other payloads (never a top-level body) | `Response` / `Request` by data direction (§9)             |
| Anything that doesn't fit the above                                   | Stop. Rethink. The taxonomy covers every legitimate case. |

---

## Enforcement

These rules are mechanical enough to grep:

```bash
# Anything in dto/ that doesn't match the allowed suffix list
ls backend/src/main/java/cephadex/ambi/dto/ \
  | grep -vE '(Request|Response|Page|Message)\.java$'
```

A non-empty result means a rule violation.
