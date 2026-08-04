# Running tests & reading the reports

How to run each suite, **where a failure is written down**, and how to get back to it
without scrolling the terminal. For what the stacks are and which verification tier runs
when, see [testing-and-ci](../infrastructure/testing-and-ci.md); for the conventions
tests must follow, see [testing-rules](../rules/testing-rules.md).

Both runners persist every run to disk. Nothing is committed — both output directories
are gitignored — but each survives until the next run of that suite.

| Suite | Command | Report artifacts |
| --- | --- | --- |
| Frontend (Vitest) | `cd frontend && npm run test:run` | `frontend/test-results/results.json`, `frontend/test-results/junit.xml` |
| Backend (Surefire) | `cd backend && ./mvnw test` | `backend/target/surefire-reports/*.txt` and `*.xml`, one pair per test class |
| Both, consolidated | `scripts/test-report.sh` | the above, plus a single merged failure list on stdout |

## The consolidated report

[`scripts/test-report.sh`](../../scripts/test-report.sh) runs both suites and then prints
one failure list assembled from the artifacts above. It does not stop at the first failing
suite — a failing suite is the output, not a reason to abort — and exits non-zero if either
suite failed.

```bash
scripts/test-report.sh              # both suites, then summarise
scripts/test-report.sh --frontend   # frontend only
scripts/test-report.sh --backend    # backend only
scripts/test-report.sh --summary    # run nothing; re-read the last run's artifacts
scripts/test-report.sh --full       # don't truncate long stacks / DOM dumps
```

`--summary` is the answer to "I ran the tests, saw red, and lost the scrollback" — it
re-renders the previous run's failures with no re-run.

Each failure is capped at 25 lines by default, because a React Testing Library miss prints
the entire accessible DOM and a Spring context failure prints hundreds of frames — one
real run of this suite went from 6,700 lines of output to 165. The cut always keeps the
assertion message, and for backend failures the innermost `Caused by:` is pulled back up
as a `↳ root cause:` line even when it falls past the cut. `--full` prints everything.

The backend run clears `backend/target/surefire-reports/` first. Surefire leaves behind
reports for classes that no longer run, so without that the summary silently mixes in a
previous run. `--summary` deliberately does not clear anything, which means a bare
`./mvnw test -Dtest=OneClass` followed by `--summary` shows that class alongside whatever
stale reports remain.

## Inspecting the raw artifacts

**Backend.** Surefire writes the stack traces straight into the per-class `.txt`, so the
file that isn't clean *is* the report:

```bash
cd backend
grep -L "Failures: 0, Errors: 0" target/surefire-reports/*.txt   # which classes broke
grep -h "Tests run:" target/surefire-reports/*.txt               # one line per class
cat target/surefire-reports/com.cephadex.ambi.presentation.deck.DeckServiceTest.txt
```

The `.xml` beside each `.txt` holds the same data structured (`<failure>` elements with
message and stack), for feeding to a JUnit report viewer.

`*.dump` / `*.dumpstream` files are not assertion failures — they mean a forked JVM died.
Read those when the suite ends without a normal failure summary.

**Frontend.** `results.json` is the machine-readable one (`numFailedTests`, then
`testResults[].assertionResults[]` with `failureMessages`); `junit.xml` is the portable
format any CI viewer or IDE reads.

```bash
cd frontend
node -e 'const r=require("./test-results/results.json");
  console.log(r.numFailedTests + " failed");
  r.testResults.flatMap(s=>s.assertionResults).filter(a=>a.status==="failed")
    .forEach(a=>console.log(a.fullName))'
```

Both files are rewritten on every run, including watch-mode reruns — so in watch mode they
always reflect the most recent pass, not the original full run.

## Re-running one test

Faster than the whole suite once you know what broke:

```bash
cd backend  && ./mvnw test -Dtest=DeckServiceTest
cd backend  && ./mvnw test -Dtest='DeckServiceTest#addSlideAppendsAfterMax'
cd frontend && npx vitest run src/features/deck/hooks/useAxisEditor.test.tsx
cd frontend && npx vitest run -t "clamped normalized point"   # by test name, any file
cd frontend && npx vitest                                      # watch mode
```

## Before you blame the code

- **Backend `@SpringBootTest` slices need Docker up** (`docker compose up -d`) — they
  connect to the real local MongoDB and Redis. `test-report.sh` warns if no compose
  services are running. `dev.env` is *not* sourced during tests; every value comes from
  `backend/src/test/resources/application-test.properties`.
- **A `@SpringBootTest` without `@ActiveProfiles("test")` loads the default profile**, so
  it misses those test-safe defaults and dies at context load — typically
  `Access key ID cannot be blank` from the `s3Presigner` bean, buried in a several-hundred
  line `UnsatisfiedDependencyException`. The `↳ root cause:` line is there to make that
  one legible. Check the annotation before chasing the stack.
- **Maven can run stale bytecode.** If a fix appears to have no effect, `touch` the changed
  sources or `./mvnw clean test` — devtools-stamped classes can outlast a fresh edit.
- **The JVM steps are serialised** on `/tmp/ambi-backend-$USER.lock`, shared with
  [`check-feature.sh`](../../scripts/check-feature.sh) and
  [`check-backend-lint.sh`](../../scripts/check-backend-lint.sh). A backend run that seems
  to hang at the start is usually waiting on another session's Maven, not stuck.
