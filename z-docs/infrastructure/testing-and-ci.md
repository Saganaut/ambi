# Testing & CI

Test stacks for both layers and the local verification tiers.

> Testing conventions (never change a test to make it pass, etc.) live in
> [backend-rules](../rules/backend-rules.md) and
> [frontend-rules](../rules/frontend-rules.md).

## Backend (Spring Boot)

Use the test starters already in `pom.xml` — no new dependencies are needed for
standard Spring test slices — and `@MockitoBean` for mocking. Tests run under the
`test` profile with `TestSecurityConfig` permitting all requests, and require
Docker to be up (`docker compose up -d`): `@SpringBootTest` controller tests
connect to the real local MongoDB and Redis.

`dev.env` is neither sourced nor present during test execution. All required
values live in `src/test/resources/application-test.properties` with test-safe
defaults — real local Docker credentials for Mongo/Redis, dummy values for the
OAuth clients and S3. **Do not put real OAuth or S3 credentials there**; tests
perform no real OAuth or S3 operations.

## Frontend

Vitest + jsdom + React Testing Library (`@testing-library/react`, `user-event`,
`jest-dom`), with `msw` mocking at the network layer. `frontend/src/test-setup.ts`
registers the custom matchers. Run `npm test` (watch) or `npm run test:run`
(single pass). Co-locate tests with the component they cover
(`Btn.test.tsx` next to `Btn.tsx`).

Visual verification of the running app goes through the Playwright screenshot
harness — see
[dev login & screenshots](../runbooks/dev-login-and-screenshots.md).

## CI

There is no hosted CI yet — no `.github/` workflow exists. Correctness is
enforced locally, in three tiers. Install the hooks once per clone:

```bash
ln -sf ../../scripts/pre-commit .git/hooks/pre-commit
ln -sf ../../scripts/pre-push   .git/hooks/pre-push
```

| Tier | When | What it runs |
| --- | --- | --- |
| **Fast** — [`scripts/pre-commit`](../../scripts/pre-commit) | every commit | `npm run lint:fast` (plain oxlint), `npm run lint:css` (Stylelint), and [`check-docs.sh`](../../scripts/check-docs.sh) (reachability + markdownlint). No JVM, no typecheck — seconds. Blocks the commit on failure. |
| **Feature gate** — [`scripts/check-feature.sh`](../../scripts/check-feature.sh) | manually, once per completed feature, before commit + review | `npm run typecheck`, `npm run lint:all`, backend `./mvnw compile` (incremental, no `clean`), [`check-backend-lint.sh`](../../scripts/check-backend-lint.sh), and the doc checks. Run until clean — this is the real quality gate. |
| **Push** — [`scripts/pre-push`](../../scripts/pre-push) | push to `main` | Both test suites (`npm run test:run`, `./mvnw test -q`). Other branches unaffected. |

Each standalone script can also be run on its own at any time.

Two mechanisms keep the heavy tier cheap: every JVM-heavy invocation is wrapped
in `flock` on a shared `/tmp/ambi-backend-$USER.lock`, so concurrent agent
sessions never stack Maven/ECJ JVMs; and `check-backend-lint.sh` caches its
resolved compile classpath keyed on the POM hash, skipping Maven entirely on a
hit.

## Backend null-analysis (Eclipse JDT)

`javac` does not report the Eclipse JDT null-analysis warnings the IDE shows
(unused imports; "needs unchecked conversion via method descriptor" on method
references under Spring's `@NonNull`/`@Nullable` defaults), so
[`check-backend-lint.sh`](../../scripts/check-backend-lint.sh) reproduces them on
the CLI — the same JDT batch compiler, the same
`backend/.settings/org.eclipse.jdt.core.prefs`, Lombok wired in as a Java agent —
and fails on any warning. It needs the Red Hat Java extension's batch compiler or
an `ECJ_JAR` pointing at a compatible jar; with neither it **skips** (exit 0)
rather than blocking headless work.
