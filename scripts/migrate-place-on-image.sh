#!/usr/bin/env bash

# One-off migration for legacy PLACE_ON_IMAGE slide content.
#
# Loads dev.env, then runs the Spring Boot app with --migrate.placeOnImage.run=true
# so PlaceOnImageContentMigration fires once and the app exits. It rewrites the
# old `content.correctTargets` list into the current `items` + `correctPositions`
# + `tolerance` shape, in both the `decks` collection and the deck snapshots
# embedded in `LiveSessions`.
#
# Idempotent: `correctTargets` is the sole marker of a legacy slide and the
# migration removes it, so a second run matches nothing. Nothing is deleted —
# every target becomes an item, and any target carrying coordinates also becomes
# an answer-key entry.
#
# Pass --dry-run to log the affected counts without writing anything.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

EXTRA_ARGS=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) EXTRA_ARGS="$EXTRA_ARGS --migrate.placeOnImage.dryRun=true" ;;
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
  -Dspring-boot.run.arguments="--migrate.placeOnImage.run=true --server.port=0${EXTRA_ARGS}"
