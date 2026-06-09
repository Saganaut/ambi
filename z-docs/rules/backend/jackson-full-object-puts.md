# JSON request bodies are full-object PUTs (Jackson 3)

**Rule:** Treat `PUT`/`POST` bodies as **complete objects** — clients send every primitive field, and tests must post the full object, not a partial fragment.

Spring Boot 4 ships **Jackson 3**, where `FAIL_ON_NULL_FOR_PRIMITIVES` defaults to `true`. A request DTO (or nested record) with primitive `int`/`boolean` components therefore rejects any body that omits one of them (`400`, `Cannot map null into type int`).

Do **not** globally disable `fail-on-null-for-primitives` to allow partial bodies: it silently coerces omitted primitives to `0`/`false` across every endpoint (a destructive pseudo-PATCH).

If genuine partial-update semantics are needed, model them explicitly with a nullable-field patch DTO and merge logic.
