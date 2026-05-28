#!/usr/bin/env bash

# Manually populates MongoDB with LOTR-themed sample data.
#
# Loads dev.env, then runs the Spring Boot app with --seed.run=true so
# SampleDataSeeder fires once and the app exits. Idempotent per collection:
# each user only gets a theme/deck/org slot if they don't already have one.
# Nothing is ever deleted.
#
# Pass --clear to also drop the seeded collections (users, organizations,
# themes, decks, gallery_images, interactive_sessions, interactive_session_results,
# audience_submissions, best_answer_votes) before re-seeding. Use this when a
# schema migration has left stale documents that Spring Data can't
# deserialize.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

EXTRA_ARGS=""
for arg in "$@"; do
  case "$arg" in
    --clear) EXTRA_ARGS="$EXTRA_ARGS --seed.clear=true" ;;
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
  -Dspring-boot.run.arguments="--seed.run=true --server.port=0${EXTRA_ARGS}"
