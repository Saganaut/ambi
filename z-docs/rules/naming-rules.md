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

1. **DTO suffixes** — Every class in a per-feature `dto/` package is a `record` in its own file, ending in exactly one of `Request`, `Response`, or `Page`. — [details](naming/dto-naming.md), including the sanctioned exceptions.

## Variable and identifier naming

1. **No single-letter variables — ever.** Single-letter identifiers (`i`, `e`, `x`, `n`, `k`, `v`, …) are forbidden in all layers (TypeScript, Java, CSS). Every variable, parameter, loop counter, and destructured binding gets a descriptive name.
