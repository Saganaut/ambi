#!/usr/bin/env bash
# Runs the test suites and prints ONE consolidated failure report, assembled from
# the artifacts each runner writes to disk — so a failure survives the terminal
# scrollback. See z-docs/runbooks/running-tests.md.
#
#   scripts/test-report.sh              # both suites, then summarise
#   scripts/test-report.sh --frontend   # frontend only
#   scripts/test-report.sh --backend    # backend only
#   scripts/test-report.sh --summary    # don't run anything; re-read the last run
#   scripts/test-report.sh --full       # don't truncate long stacks / DOM dumps
#
# Deliberately NOT `set -e` around the suites: a failing suite is the output we
# want, not a reason to abort before the other one has run. The final exit code
# is non-zero if either suite failed.

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
FRONTEND_JSON="$REPO_ROOT/frontend/test-results/results.json"
SUREFIRE_DIR="$REPO_ROOT/backend/target/surefire-reports"

# Shared with check-feature.sh, check-backend-lint.sh and pre-push — one
# Maven/ECJ JVM at a time per user, no matter how many sessions are running.
LOCK="/tmp/ambi-backend-${USER:-$(id -un)}.lock"

run_frontend=1
run_backend=1
run_suites=1

# A React Testing Library failure prints the whole accessible DOM, and a Spring
# context failure prints hundreds of frames — full fidelity is in the artifacts,
# so the summary keeps the head of each and points at the file. 0 = no limit.
MAX_LINES=25

for arg in "$@"; do
  case "$arg" in
    --frontend) run_backend=0 ;;
    --backend) run_frontend=0 ;;
    --summary) run_suites=0 ;;
    --full) MAX_LINES=0 ;;
    -h | --help)
      sed -n '2,14{s/^# \?//;p}' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg (try --help)" >&2
      exit 2
      ;;
  esac
done

frontend_status="skipped"
backend_status="skipped"
failed=0

# ---------------------------------------------------------------- run the suites

if [[ $run_suites -eq 1 && $run_frontend -eq 1 ]]; then
  echo "▶ Frontend tests (vitest)..."
  if (cd "$REPO_ROOT/frontend" && npm run test:run); then
    frontend_status="passed"
  else
    frontend_status="failed"
    failed=1
  fi
fi

if [[ $run_suites -eq 1 && $run_backend -eq 1 ]]; then
  if ! (cd "$REPO_ROOT" && docker compose ps --status running --quiet 2>/dev/null) | grep -q .; then
    echo "⚠ Docker services don't look up — @SpringBootTest slices need Mongo and Redis."
    echo "  Start them with: docker compose up -d"
  fi
  echo ""
  echo "▶ Backend tests (surefire)..."
  # Surefire leaves reports for classes that no longer run, so clear the
  # directory first — otherwise the summary below mixes in a previous run.
  rm -rf "$SUREFIRE_DIR"
  if (cd "$REPO_ROOT/backend" && flock "$LOCK" ./mvnw test -q); then
    backend_status="passed"
  else
    backend_status="failed"
    failed=1
  fi
fi

# ------------------------------------------------------------------- summarise

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " Consolidated test report"
echo "═══════════════════════════════════════════════════════════════"

if [[ $run_frontend -eq 1 ]]; then
  echo ""
  echo "── Frontend ─ $FRONTEND_JSON"
  if [[ -f "$FRONTEND_JSON" ]]; then
    node -e '
      const fs = require("node:fs");
      const r = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      const when = new Date(r.startTime).toISOString().replace("T", " ").slice(0, 19);
      console.log(`   ${r.numPassedTests} passed, ${r.numFailedTests} failed, ` +
        `${r.numPendingTests + r.numTodoTests} skipped  (run at ${when} UTC)`);
      const root = process.argv[2] + "/frontend/";
      const max = Number(process.argv[3]);
      const emit = (text, indent) => {
        const lines = text.split("\n");
        const shown = max > 0 ? lines.slice(0, max) : lines;
        for (const line of shown) console.log(indent + line);
        if (lines.length > shown.length) {
          console.log(`${indent}… ${lines.length - shown.length} more lines (--full to expand)`);
        }
      };
      for (const suite of r.testResults) {
        const failures = suite.assertionResults.filter((a) => a.status === "failed");
        // A suite that throws on import has no assertions, only a message.
        if (!failures.length && suite.status !== "failed") continue;
        console.log(`\n   ✗ ${suite.name.replace(root, "")}`);
        if (!failures.length && suite.message) emit(suite.message, "     ");
        for (const a of failures) {
          console.log(`     • ${a.fullName}`);
          for (const m of a.failureMessages) emit(m, "       ");
        }
      }
      process.exit(r.numFailedTests > 0 ? 1 : 0);
    ' "$FRONTEND_JSON" "$REPO_ROOT" "$MAX_LINES" || failed=1
  else
    echo "   no report — run without --summary, or: cd frontend && npm run test:run"
  fi
fi

if [[ $run_backend -eq 1 ]]; then
  echo ""
  echo "── Backend ─ $SUREFIRE_DIR"
  if compgen -G "$SUREFIRE_DIR/*.txt" > /dev/null; then
    awk -F'[:,]' '/^Tests run:/ {
      run += $2; fail += $4; err += $6; skip += $8
    } END {
      printf "   %d run, %d failures, %d errors, %d skipped\n", run, fail, err, skip
    }' "$SUREFIRE_DIR"/*.txt

    # Surefire writes the stack traces straight into the per-class .txt, so the
    # file that isn't clean IS the report.
    mapfile -t broken < <(grep -L "Failures: 0, Errors: 0" "$SUREFIRE_DIR"/*.txt)
    for f in "${broken[@]}"; do
      echo ""
      # +5 clears the 4-line header and the per-test FAILURE line, so the cap
      # applies to the stack trace rather than swallowing the exception itself.
      total=$(wc -l < "$f")
      if [[ $MAX_LINES -gt 0 && $total -gt $((MAX_LINES + 5)) ]]; then
        head -n $((MAX_LINES + 5)) "$f" | sed 's/^/   /'
        echo "   … $((total - MAX_LINES - 5)) more lines in ${f#"$REPO_ROOT"/} (--full to expand)"
        # Spring buries the actionable reason in the innermost `Caused by:`,
        # which is usually well past the cut — pull it back up.
        root_cause=$(tail -n +$((MAX_LINES + 6)) "$f" | grep "^Caused by:" | tail -1)
        [[ -n "$root_cause" ]] && echo "   ↳ root cause: ${root_cause:0:400}"
      else
        sed 's/^/   /' "$f"
      fi
      failed=1
    done

    if compgen -G "$SUREFIRE_DIR"/*.dumpstream > /dev/null; then
      echo ""
      echo "   ⚠ JVM crash dumps present (a forked JVM died, not an assertion):"
      for d in "$SUREFIRE_DIR"/*.dumpstream; do echo "     $d"; done
      failed=1
    fi
  else
    echo "   no reports — run without --summary, or: cd backend && ./mvnw test"
  fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
if [[ $run_suites -eq 1 ]]; then
  echo " frontend: $frontend_status   backend: $backend_status"
fi

if [[ $failed -eq 0 ]]; then
  echo " ✅ No failures in the reports."
else
  echo " ❌ Failures above. Full artifacts:"
  echo "    frontend/test-results/{results.json,junit.xml}"
  echo "    backend/target/surefire-reports/*.{txt,xml}"
fi

exit $failed
