# DTO / API Naming

**Rule:** Strict, mechanical naming for classes in `backend/src/main/java/cephadex/ambi/dto/`. The point is to remove judgment — two engineers should agree on a class name without debate.

## 1. Exactly one suffix per category

Every class in `dto/` ends in exactly one of these — there is no `*DTO`, `*Query`, `*View`, `*Info`, `*Result`, `*Envelope`, or no-suffix class. If a class fits none of the four, the design is wrong, not the rule.

| Suffix     | Direction | Purpose                                                                 | Examples                                                          |
| ---------- | --------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `Request`  | Inbound   | Any client-sent payload — POST/PUT/PATCH bodies *and* GET query objects  | `CreateDeckRequest`, `DeckExploreRequest`                        |
| `Response` | Outbound  | Anything returned over HTTP — resource reads *and* action result envelopes | `DeckResponse`, `RedeemInviteResponse`                          |
| `Page<T>`  | Outbound  | Paginated list envelope. Use `Page<T>` directly; subclass only to add summary fields | `Page<DeckResponse>`, `DeckRatingsPage`                |
| `Message`  | Outbound  | WebSocket / STOMP broadcast payload. Never an HTTP response.             | `RoundStartMessage`, `PresenceMessage`                          |

`Response` (not `DTO`) pairs symmetrically with `Request` and signals data direction; `DTO` is redundant when the package is already `dto/`.

## 2. Records, not classes

Every type in `dto/` is a `public record`. No `class`, no `@Data`/`@Value` Lombok wrappers, no abstract bases. Records make immutability and equality free and play well with Jackson and SpringDoc.

## 3. One type per file

Each `.java` file declares exactly one top-level public type. No inner records, no siblings sharing a file. Tightly-related records (`CreateTagRequest`, `UpdateTagRequest`) each get their own file — discoverability comes from naming, not co-location.

## 4. No generic envelope types

No reusable wrappers like `ValueRequest<T>`, `Wrapper<T>`, `Envelope<T>`. The only permitted generic is `Page<T>`. Write a named record per use site — `RenameDeckRequest(String name)` beats `ValueRequest<String>`.

## 5. Pagination — prefer `Page<T>` directly

Return `Page<DeckResponse>` directly. Introduce a named `*Page` subclass only when the endpoint needs extra summary fields (histogram, aggregate counts). A `*Page` subclass that adds nothing is forbidden boilerplate.

## 6. Action results are `Response`

An action's confirmation envelope (e.g. `POST /api/decks/{id}/favorite` → `{ deckId, isFavorited, count }`) is `DeckFavoriteResponse`. Never invent `Result`, `Outcome`, or `Confirmation`.

## 7. Query objects are `Request`

A `@RequestParam`-bound GET filter/sort/search object is `*Request`, same as a write body. There is one inbound suffix.

## 8. WebSocket payloads are `Message`

Server-to-client STOMP broadcasts use `Message` — never `Event`, `Update`, or `Notification`, even when the payload represents an event. (Client-to-server messages, if any, would be `Request`.)

## 9. Nested component records still take a suffix

A record that exists only as a field inside another payload still lives in `dto/`, still gets its own file, and still ends in a suffix — chosen by the **direction the data flows**, not where it's embedded. Outbound-only → `Response`; inbound-only → `Request`. A record shared by a `Message` and a `Response` is still outbound, so `Response` (`PlayerRoundResponse` is the canonical example). Don't invent a suffix-less "component"/"row"/"detail" type to dodge this.

## Quick decision table

| You are creating…                                                     | Suffix                                       |
| --------------------------------------------------------------------- | -------------------------------------------- |
| A JSON body for a POST/PUT/PATCH                                       | `Request`                                    |
| A `@RequestParam`-bound query object on a GET                         | `Request`                                    |
| The JSON returned by any HTTP endpoint                                | `Response`                                   |
| A paginated list (no extra fields)                                    | `Page<XxxResponse>`                          |
| A paginated list with summary fields                                  | `XxxPage extends Page<…>`                    |
| A STOMP/WebSocket broadcast payload                                   | `Message`                                    |
| A record embedded only inside other payloads                          | `Response` / `Request` by data direction (§9)|
| Anything that doesn't fit the above                                   | Stop. Rethink. The taxonomy covers every case.|

## Enforcement

```bash
# Anything in dto/ that doesn't match the allowed suffix list
ls backend/src/main/java/cephadex/ambi/dto/ \
  | grep -vE '(Request|Response|Page|Message)\.java$'
```

A non-empty result means a violation.
