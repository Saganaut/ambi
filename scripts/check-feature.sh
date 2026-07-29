#!/usr/bin/env bash
# Full verification gate — run ONCE PER FEATURE CHANGE, after the implementation
# is finished and before committing/review. The pre-commit hook only runs the
# fast tier (plain oxlint, Stylelint, doc checks); everything expensive lives
# here: frontend typecheck, type-aware lint, backend compile, and the Eclipse
# JDT null-analysis.
#
# The JVM-heavy steps are serialized across concurrent sessions with a shared
# flock, so parallel agents can't stack Maven/ECJ JVMs and freeze the machine.
set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"

# Shared with scripts/check-backend-lint.sh and scripts/pre-push — one Maven/ECJ
# JVM at a time per user, no matter how many sessions are running.
LOCK="/tmp/ambi-backend-${USER:-$(id -un)}.lock"

echo "▶ Frontend typecheck..."
(cd "$REPO_ROOT/frontend" && npm run typecheck)

echo "OK - Typecheck passed."

echo "▶ Frontend lint (type-aware oxlint + Stylelint)..."
(cd "$REPO_ROOT/frontend" && npm run lint:all)

echo "OK - Lint passed."

# Incremental (no `clean`): a full rebuild costs minutes and buys nothing here.
echo "▶ Backend compile (incremental)..."
(cd "$REPO_ROOT/backend" && flock "$LOCK" ./mvnw compile)

echo "OK - Backend compile passed."

echo "▶ Backend null-analysis (Eclipse JDT)..."
"$REPO_ROOT/scripts/check-backend-lint.sh"

echo "OK - Backend null-analysis passed."

echo "▶ Documentation checks (reachability + markdownlint)..."
"$REPO_ROOT/scripts/check-docs.sh"

echo "OK - Docs passed."


echo "🐙🐙🐙 All feature checks passed! 🐙🐙🐙"
