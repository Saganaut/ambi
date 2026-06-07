# Backend Rules (Java / Spring Boot)

Rules specific to the Spring Boot backend under `backend/`.

1.  **Java/Spring Boot Standards:** Adhere to standard Java and Spring Boot coding conventions and best practices.
2.  **Lombok:** Use Lombok for boilerplate reduction in DTOs and models.
3.  **Feature Architecture:**
    - Each feature has its own folder with sub folders
    - DTO class names follow [DTO-NAMING-RULES.md](DTO-NAMING-RULES.md): every class in `dto/` ends in one of `Request`, `Response`, `Page`, or `Message`, is a `record`, and lives in its own file.
4.  **API Documentation:** Document all REST endpoints using Springdoc OpenAPI so the `/swagger-ui/` specification stays current.
5.  **Testing:**
    - Write comprehensive unit/integration tests for new features and bug fixes.
    - Utilize Spring Boot test starters and `@MockitoBean` for mocking.
    - Run tests under the "test" profile with `TestSecurityConfig`.
    - Never change a test to make it pass without addressing the underlying issue. Always fix the code or the test to ensure correctness.
6.  **API Client Regeneration:** Regenerate the frontend API client after any backend API changes affecting the OpenAPI schema.
7.  **CI Must Pass Before Merging:** Every PR targeting `main` must have the GitHub Actions CI checks (`Frontend tests` and `Backend tests`) passing before it is merged.
8.  **No magic numbers — defaults live in `@ConfigurationProperties`:**
    - Tunable defaults, limits, and TTLs (anything an operator might reasonably change per environment) belong in a strongly-typed `@ConfigurationProperties` bean, **not** as literals scattered through services, seeders, or entities. Follow the established pattern: a Lombok `@Data` class with nested `@Data` groups, a `ambi.<feature>` prefix, defaults as field initializers, auto-registered via `@ConfigurationPropertiesScan`. References: `auth/config/AuthProperties.java`, `presentation/deck/config/DeckDefaultsProperties.java`.
    - Keep the immutable domain (records) as-is; expose factory methods on the properties bean that materialize the records, and convert at the edge.
    - **Validation bounds are the exception** — they can't be config (annotation args must be compile-time constants), so they live as `public static final` values in the single `common/validation/ValidationConstants.java` and are referenced from every `@Size`/`@Min`/`@Max`/`@Pattern`. This is also the **single source of truth shared with the frontend**: SpringDoc projects the constraints into the OpenAPI schema (`maxLength`/`minLength`/`minimum`/`maximum`/`pattern`), and `frontend/scripts/generate-validation.mjs` lifts them into a committed `validationConstants.ts`. Change a bound once here, regenerate, and both tiers move together. `OpenApiValidationFacetsTest` guards that the facets keep reaching the schema.
    - **Collection-element constraints need help to cross the bridge.** SpringDoc does *not* propagate an element-level `@Size`/`@Pattern` on a generic (e.g. `Set<@Size(min=1,max=50) String>`) into the schema's `items{}` — only the array-level facet (`maxItems`) surfaces. To carry the element bound to the frontend, add an explicit `@ArraySchema(maxItems = …, schema = @Schema(minLength = …, maxLength = …))` referencing the same `ValidationConstants` (keep the Jakarta `@Size` for runtime validation). `SetTagsRequest.tags` is the worked example. Note `@ArraySchema`'s array facets live on the annotation itself (`maxItems`/`minItems`), not inside its nested `@Schema`.
    - **Other exceptions** (keep as code constants too): safety invariants that must never be environment-tunable (e.g. a new deck defaults to `DRAFT`/`PRIVATE`).
9.  **JSON request bodies are full-object PUTs (Jackson 3):** Spring Boot 4 ships **Jackson 3**, where `FAIL_ON_NULL_FOR_PRIMITIVES` defaults to `true`. A request DTO (or nested record) with primitive `int`/`boolean` components therefore rejects any body that omits one of them (`400`, `Cannot map null into type int`). Treat `PUT`/`POST` bodies as **complete objects** — clients send every primitive field, and tests must post the full object, not a partial fragment. Do **not** globally disable `fail-on-null-for-primitives` to allow partial bodies: it silently coerces omitted primitives to `0`/`false` across every endpoint (a destructive pseudo-PATCH). If genuine partial-update semantics are needed, model them explicitly with a nullable-field patch DTO and merge logic.
