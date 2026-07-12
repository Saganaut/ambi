# Naming Rules

File-naming conventions for the frontend, plus backend DTO/API class naming.

## Frontend file names

1. **Generated** files carry `.gen.` — e.g. `foo.gen.ts`.
2. **Test** files carry `.test.` — e.g. `foo.test.ts`.
3. **Storybook** files carry `.stories.` — e.g. `foo.stories.tsx`.
4. **Components** are PascalCase — e.g. `Foo.tsx`.
5. **Hooks** are camelCase and start with `use` — e.g. `useFoo.ts`.
6. **Utilities** are camelCase — e.g. `foo.ts`.
7. **Type definitions** are PascalCase and end with `.types` — e.g. `Foo.types.ts`.

## Backend DTO / API class names

1. **DTO suffixes** — Every class in a per-feature `dto/` package (e.g. `presentation/deck/dto/`, `session/dto/`, `media/gallery/dto/`) ends in exactly one of `Request`, `Response`, or `Page`, is a `record`, and lives in its own file. **Exception:** `session/event/dto/` holds a sanctioned family of session read-model / projection records suffixed `*View` (plus `ScoreboardEntry`), used for participant/host-safe live-session snapshots — see [details](naming/dto-naming.md) for the full suffix taxonomy, the `MeResponse` sealed-interface exception, and why live-session STOMP broadcasts are `SessionEvent` implementations rather than `dto/` classes.

## Variable and identifier naming

1. **No single-letter variables — ever.** Single-letter identifiers (`i`, `e`, `x`, `n`, `k`, `v`, …) are absolutely forbidden in all layers (TypeScript, Java, CSS). Every variable, parameter, loop counter, and destructured binding must have a descriptive name that communicates its purpose. There are no exceptions: not for loop indices, not for error parameters, not for short-lived temporaries.
