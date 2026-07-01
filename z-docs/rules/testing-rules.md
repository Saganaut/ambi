# Testing Rules

How tests are written on both tiers. The stacks, CI workflow, and local hooks are in [Testing & CI](../infrastructure/testing-and-ci.md); this file is the house style. The overriding rule from [AGENTS.md](../../AGENTS.md) stands: **never change a test to make it pass without fixing the underlying issue.**

## Both tiers

1. **Name tests as plain subject-verb-outcome phrases — no `test`/`should` prefix.** Backend: `nullPrincipalResolvesToVisitor()`, `registerRejectsNonPreRegistrationPrincipal()`. Frontend `it(...)` strings read the same way: `"renders the conversation and collapses/expands the whole thread"`. The name states the behavior, not the method under test.
2. **Fixtures are local builder functions with override support, never shared factory libraries.** Backend uses `private static` builders inside the test class (`user(id, level, status, tier)`, `principalFor(state, userId)`); frontend uses module-level arrow factories taking `Partial<T>` (`comment({...})`, `thread({...})`) plus a local `renderX()` helper. There is no `__testUtils` / shared-factory module on either tier.
3. **A header comment states what the file covers.** Backend: a class-level Javadoc naming the behaviors/invariants/branches under test (`AuthServiceTest`, `DeckServiceTest`). Frontend: a 1–3 line top-of-file comment (`CommentThread.test.tsx`).

## Backend

1. **Pick the setup by test kind** — three established shapes, don't mix them:

   | Test kind            | Setup                                                                                              | Examples                                              |
   | -------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
   | Service unit test    | Plain `mock(Foo.class)` fields wired in `@BeforeEach`, real collaborators where cheap; no Mockito annotations | `DeckServiceTest`, `GalleryServiceTest`, `UserServiceTest`, `CommentThreadServiceTest` |
   | Controller unit test | `@ExtendWith(MockitoExtension.class)` + `@Mock` deps + `MockMvcBuilders.standaloneSetup(controller)` (register `AuthenticationPrincipalArgumentResolver` when the controller reads `@AuthenticationPrincipal`) | `DeckControllerTest`, `AuthControllerTest`            |
   | Integration / config | `@SpringBootTest(classes = AmbiApplication.class)`                                                  | `CsrfEnforcementTest`, `OpenApiValidationFacetsTest`  |

   (`AuthServiceTest` predates the service-test shape and uses `@Mock` + `MockitoAnnotations.openMocks(this)` closed via an `AutoCloseable` — don't copy it for new service tests; use plain `mock(...)`.)

2. **No `@WebMvcTest` slices.** Boot 4's slice has controller-registration quirks; use standalone `MockMvc` (unit) or full `@SpringBootTest` (integration) instead. See `TestBootstrapConfig` / `AuthControllerTest` for the rationale.
3. **AssertJ for assertions** (`assertThat(...)`, `assertThatThrownBy(...)`) — not raw JUnit `assertEquals` or Hamcrest. Assert on typed payloads with `isInstanceOfSatisfying(...)`.
4. **Prefer fixed `Instant.parse(...)` over `Instant.now()`** for deterministic assertions — see [time-rules.md](time-rules.md) §5.
5. **No `@Nested` or `@DisplayName`.** Group related methods with `// ── section ──` divider comments (`// ── register (Phase 2) ──`, `// ── helpers ──`) instead.

## Frontend

1. **Vitest + React Testing Library + `userEvent`.** `vi.fn()` for callbacks (never `jest.fn()`); drive interactions with `userEvent.setup()` + `await user.click(...)` — never `fireEvent`.
2. **Query by accessible role/name first** (`screen.getByRole("button", { name: "Collapse thread" })`), matching [frontend-rules.md](frontend-rules.md) §9. Reach for text/test-id queries only when no accessible handle exists.
3. **MSW backs anything that hits the API**; store-free components take their data as props and need no provider (see `CommentThread.test.tsx`). Reusable Storybook/test sample data lives in a co-located `*.mocks.ts`.
