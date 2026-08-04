#!/usr/bin/env bash

# One-off migration giving every existing deck its own S3 copies of the images
# placed in it.
#
# Loads dev.env, then runs the Spring Boot app with --migrate.deckImages.run=true
# so DeckImageOwnershipMigration fires once and the app exits. Every stored
# image embedded in a `decks` document whose key lies outside the deck's own
# `deck/{deckId}/` namespace gets its original + variants copied under a fresh
# deck-owned prefix and its keys rewritten (LiveSessions snapshots are
# deliberately untouched).
#
# Idempotent: adopted images live under the deck's own prefix and are skipped on
# a re-run; placements whose source object is already gone are logged and left
# unchanged, so re-runs converge.
#
# Pass --dry-run to log the affected counts without writing anything (no S3
# copies either).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

EXTRA_ARGS=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) EXTRA_ARGS="$EXTRA_ARGS --migrate.deckImages.dryRun=true" ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

# Sourcing dev.env mirrors scripts/ambi.sh. dev.env may contain stray
# non-assignment lines (legacy comments) that bash will report as errors; we
# tolerate them so the env vars we do need still land in the environment.
if [ -f "${PROJECT_ROOT}/dev.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "${PROJECT_ROOT}/dev.env" 2>/dev/null || true
  set +a
fi

cd "${PROJECT_ROOT}/backend"
# server.port=0 binds to a random free port so this can run alongside a
# normally-running backend on 8080 without a bind collision.
./mvnw spring-boot:run \
  -Dspring-boot.run.arguments="--migrate.deckImages.run=true --server.port=0${EXTRA_ARGS}"
