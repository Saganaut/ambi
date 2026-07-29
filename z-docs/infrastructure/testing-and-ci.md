# Testing & CI

Test stacks for both layers and the local verification tiers (pre-commit hook, per-feature gate, pre-push hook).

> Rule-level testing conventions (don't change a test to make it pass, etc.) live in [backend-rules](../rules/backend-rules.md) and [frontend-rules](../rules/frontend-rules.md).

## Backend (Spring Boot)

When adding backend tests, use the test starters already present in `pom.xml` — no new dependencies needed for standard Spring test slices. Use `@MockitoBean` for mocking in Spring Boot 4 tests. Tests run under the "test" profile with `TestSecurityConfig` permitting all requests.

### Test environment variables

In local dev `scripts/ambi.sh` sources `dev.env` into the environment before launching the backend, but that file is neither sourced nor present during test execution. All required values are instead provided in `src/test/resources/application-test.properties` with test-safe defaults (real local Docker credentials for Mongo/Redis, dummy values for Google OAuth and S3). **Do not add real OAuth or S3 credentials to that file** — dummy values are sufficient because tests do not perform real OAuth or S3 operations.

Backend tests require Docker to be running (`docker compose up -d`) because `@SpringBootTest` controller tests connect to the real local MongoDB and Redis.

## Frontend (Vitest + jsdom + React Testing Library)

| Tool                          | Role                                          |
| ----------------------------- | --------------------------------------------- |
| `vitest`                      | Test runner and assertions                    |
| `jsdom`                       | DOM environment for component rendering       |
| `@testing-library/react`      | Component rendering and querying              |
| `@testing-library/user-event` | Realistic user interaction simulation         |
| `@testing-library/jest-dom`   | Custom DOM matchers (toBeInTheDocument, etc.) |
| `msw`                         | API mocking at the network layer              |

Setup file: `frontend/src/test-setup.ts` — imports `@testing-library/jest-dom` to register custom matchers.

Run tests: `npm test` (watch mode) or `npm run test:run` (single pass).

Co-locate test files with the component they test (e.g., `Btn.test.tsx` next to `Btn.tsx`). Test files must follow the same naming and comment conventions as source files.

## Screenshot verification (dev only)

A headless [Playwright](https://playwright.dev/) harness captures full-page screenshots of the running app so UI changes can be verified visually — including the behind-login pages (decks, editor, present, live sessions).

The obstacle is auth: only a `REGISTERED` user reaches those pages, a guest cannot, and real Google OAuth is not headless-friendly. To bridge it, the backend exposes a **DEV-only** login shortcut:

- `POST /api/dev/login` — mints a real registered session (sets `AMBI_AT`/`AMBI_RT`) for a fixed, self-seeding internal dev account (`devuser`, provider `INTERNAL`, subject `dev-login`). No Google credentials and no seed run are required; the account is created on first call and reused thereafter.
- It is gated by `@Profile("DEV")` (`DevAuthController` + `DevSecurityConfig`), so the beans **do not exist under the `PROD` profile** — the endpoint is absent in production. Its dedicated `/api/dev/**` filter chain is CSRF-exempt so a plain `POST` works.

Run it (infra + backend on the `DEV` profile + frontend dev server must all be up; one-time `npx playwright install chromium`):

```bash
cd frontend
npm run screenshot                       # default routes (/, /decks)
npm run screenshot -- /decks /account    # explicit routes
npm run screenshot -- /decks/<id>/edit   # id-bearing routes need a real id
```

PNGs are written to `frontend/.screenshots/` (git-ignored). The script (`frontend/scripts/screenshot.mjs`) logs in via `/api/dev/login`, then screenshots each route as the logged-in dev user.

## CI

There is no GitHub Actions (or other hosted) CI configured yet — no `.github/` workflow exists in the repo. Correctness is instead enforced locally, in three tiers (see below), which every contributor installs/runs.

## Local enforcement tiers

Verification is split so that the cheap checks run constantly and the expensive JVM-heavy ones run once per feature. Install the two hooks once per clone:

```bash
ln -sf ../../scripts/pre-commit .git/hooks/pre-commit
ln -sf ../../scripts/pre-push   .git/hooks/pre-push
```

| Tier                                                           | When                                              | What it runs                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fast** — [`scripts/pre-commit`](../../scripts/pre-commit)     | Automatically, on every commit                    | `npm run lint:fast` (plain oxlint, no type-aware pass), `npm run lint:css` (Stylelint), and the documentation checks via [`scripts/check-docs.sh`](../../scripts/check-docs.sh) (reachability + markdownlint). No JVM, no typecheck — it finishes in seconds. The commit is blocked if any step fails.                                |
| **Feature gate** — [`scripts/check-feature.sh`](../../scripts/check-feature.sh) | Manually, once per completed feature change — after implementation, before commit and review | `npm run typecheck`, `npm run lint:all` (type-aware oxlint + Stylelint), the backend `./mvnw compile` (**incremental** — no `clean`), the backend null-analysis via [`scripts/check-backend-lint.sh`](../../scripts/check-backend-lint.sh), and the documentation checks. Run it until clean; it is the real quality gate. |
| **Push** — [`scripts/pre-push`](../../scripts/pre-push)         | Automatically, on push to `main`                  | Both test suites (`npm run test:run`, `./mvnw test -q`). Pushes to other branches are unaffected.                                                                                                                                                                                                                                    |

Either of the standalone scripts can be run on its own at any time: `./scripts/check-docs.sh`, `./scripts/check-backend-lint.sh`, `./scripts/check-feature.sh`.

### Keeping the heavy tier cheap

Two mechanisms stop the feature gate from monopolising the machine:

- **Serialized JVMs.** Several agent sessions often work the repo at once, and stacked Maven/ECJ JVMs freeze it. Every JVM-heavy invocation (`mvnw compile` in the feature gate, `mvnw dependency:build-classpath` and the ECJ run in `check-backend-lint.sh`, `mvnw test` in `pre-push`) is wrapped in `flock` on a shared `/tmp/ambi-backend-$USER.lock`, so only one runs at a time. Blocking is intentional — the waiting run proceeds as soon as the lock frees.
- **Cached ECJ classpath.** `check-backend-lint.sh` used to spend a whole Maven JVM startup just resolving the compile classpath. It now caches the result at `backend/target/ecj-classpath-<sha256-of-pom.xml>.txt` (git-ignored) and skips Maven entirely on a hit. The key is the POM hash, so the cache invalidates exactly when dependencies can change; because routine flows no longer run `mvn clean`, it persists, and a wiped `target/` just regenerates it.

## Backend null-analysis (Eclipse JDT)

The IDE's Java "Problems" panel surfaces Eclipse JDT null-analysis warnings — unused imports, and "needs unchecked conversion via method descriptor" on method references under Spring's `@NonNull`/`@Nullable` defaults (see `backend/.settings/org.eclipse.jdt.core.prefs` and the `java.compile.nullAnalysis.mode` VS Code setting). `javac` (and therefore `mvn compile`) does **not** report these, so [`scripts/check-backend-lint.sh`](../../scripts/check-backend-lint.sh) reproduces them on the CLI: it runs the same JDT batch compiler the Red Hat Java extension bundles, with those prefs and Lombok wired in as a Java agent, and fails on any warning.

It runs as part of the feature gate, and on demand: `./scripts/check-backend-lint.sh`. It requires the Red Hat Java extension (its batch compiler is auto-detected), or an `ECJ_JAR` pointing at a compatible `org.eclipse.jdt.core.compiler.batch_*.jar`. When neither is found the script **skips** (exit 0) rather than failing, so it never blocks work in a headless environment.
