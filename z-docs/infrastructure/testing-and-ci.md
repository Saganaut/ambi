# Testing & CI

Test stacks for both layers, the GitHub Actions CI workflow, and the local pre-commit / pre-push git hooks.

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

## CI (GitHub Actions)

GitHub Actions runs both test suites on every push to `main` and every PR targeting `main`. Workflow: `.github/workflows/ci.yml`. Both jobs run in parallel; the push/merge is blocked if either fails.

To enforce this at the repository level, enable branch protection on `main` in GitHub repo Settings → Branches → Require status checks (select `Frontend tests` and `Backend tests`).

## Local git hooks

Two hook scripts are committed in `scripts/`. Install both once per clone:

```bash
ln -sf ../../scripts/pre-commit .git/hooks/pre-commit
ln -sf ../../scripts/pre-push   .git/hooks/pre-push
```

- **pre-commit** — runs `lint:all` (ESLint + Stylelint) on every commit. The commit is blocked if any lint error is reported.
- **pre-push** — runs both test suites only when pushing to `main`. Pushes to other branches are unaffected.