# No magic numbers — defaults live in `@ConfigurationProperties`

**Rule:** Tunable defaults, limits, and TTLs go in a strongly-typed `@ConfigurationProperties` bean — never as literals scattered through services, seeders, or entities.

Follow the established pattern: a Lombok `@Data` class with nested `@Data` groups, an `ambi.<feature>` prefix, defaults as field initializers, auto-registered via `@ConfigurationPropertiesScan`. References: `auth/config/AuthProperties.java`, `presentation/deck/config/DeckDefaultsProperties.java`.

Keep the immutable domain (records) as-is; expose factory methods on the properties bean that materialize the records, and convert at the edge.

## Validation bounds are the exception (and the frontend single source of truth)

Validation bounds can't be config — annotation args must be compile-time constants — so they live as `public static final` values in the single `common/validation/ValidationConstants.java`, referenced from every `@Size`/`@Min`/`@Max`/`@Pattern`.

This is also the **single source of truth shared with the frontend**: SpringDoc projects the constraints into the OpenAPI schema (`maxLength`/`minLength`/`minimum`/`maximum`/`pattern`), and `frontend/scripts/generate-validation.mjs` lifts them into committed per-feature `<feature>ValidationConstants.ts` files (+ `sharedValidationConstants.ts`). Change a bound once here, regenerate, and both tiers move together. `OpenApiValidationFacetsTest` guards that the facets keep reaching the schema.

## Collection-element constraints need help to cross the bridge

SpringDoc does *not* propagate an element-level `@Size`/`@Pattern` on a generic (e.g. `Set<@Size(min=1,max=50) String>`) into the schema's `items{}` — only the array-level facet (`maxItems`) surfaces. To carry the element bound to the frontend, add an explicit `@ArraySchema(maxItems = …, schema = @Schema(minLength = …, maxLength = …))` referencing the same `ValidationConstants` (keep the Jakarta `@Size` for runtime validation). `SetTagsRequest.tags` is the worked example. Note `@ArraySchema`'s array facets live on the annotation itself (`maxItems`/`minItems`), not inside its nested `@Schema`.

## Other exceptions (keep as code constants too)

Safety invariants that must never be environment-tunable — e.g. a new deck defaults to `DRAFT`/`PRIVATE`.
