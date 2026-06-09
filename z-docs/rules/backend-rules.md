# Backend Rules

Rules for the Spring Boot backend under `backend/`.

1. **Java / Spring standards** — Follow standard Java and Spring Boot conventions and best practices.
2. **Lombok & injection** — Use Lombok to reduce boilerplate in models (DTOs are records — see naming). Services and controllers use plain constructor injection — no `@Autowired`, no `@RequiredArgsConstructor`. — [details](backend/persistence-conventions.md)
3. **Feature architecture** — Each feature has its own folder with sub-folders (`dto/`, `enums/`, `config/`, …). DTO classes follow the [naming rules](naming-rules.md); entity↔DTO mapping lives on the records as `static from(...)` / `to<Domain>()` — no mapper classes. — [details](backend/dto-mapping.md)
4. **API documentation** — Document every REST endpoint with Springdoc OpenAPI so `/swagger-ui/` stays current.
5. **Testing** — Write comprehensive unit/integration tests with Spring Boot test starters, run under the `test` profile with `TestSecurityConfig`. Service tests mock collaborators with plain `mock(...)`; controller tests use standalone `MockMvc`; integration tests use `@SpringBootTest`. Never change a test to make it pass without fixing the underlying issue. — see [testing-rules.md](testing-rules.md)
6. **Regenerate the API client** — After any backend change affecting the OpenAPI schema, regenerate the frontend client.
7. **CI must pass before merging** — Every PR to `main` must have `Frontend tests` and `Backend tests` green before merge.
8. **No magic numbers** — Tunable defaults, limits, and TTLs live in a strongly-typed `@ConfigurationProperties` bean, not as scattered literals; validation bounds are the exception (the single source of truth shared with the frontend). — [details](backend/config-properties.md)
9. **Full-object PUTs (Jackson 3)** — Jackson 3 rejects bodies that omit a primitive field; treat `PUT`/`POST` bodies as complete objects. Don't globally disable `fail-on-null-for-primitives`. — [details](backend/jackson-full-object-puts.md)
10. **Embedded sub-documents get their own write API** — Persist an independently-editable embedded sub-object via a targeted update on its own endpoint, never through the parent aggregate's general `save()`. — [details](backend/embedded-subdocument-writes.md)
11. **Timestamps** — Use `Instant` everywhere and `Auditable` for `createdAt`/`updatedAt`. See [time-rules.md](time-rules.md).
12. **Errors** — Produce errors per the [exception rules](exception-rules.md).
13. **Authorization** — Access is domain logic, not annotations: pure permission predicates on the aggregate, applied by the service (load → `require*` → return), with the requester's capabilities returned as `ViewerPermissions`. No `@PreAuthorize`. — [details](backend/authorization.md)
14. **Persistence & controllers** — Documents extend `BaseDocument`/`Auditable`; collections are `snake_case` plural; enums live in `<feature>/enums/`; controllers return the Response DTO directly (no `ResponseEntity`) under `/api/<feature>`. — [details](backend/persistence-conventions.md)
