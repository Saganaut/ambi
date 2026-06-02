#!/usr/bin/env bash

# Manually populates MongoDB with LOTR-themed sample data.
#
# Loads dev.env, then runs the Spring Boot app with --seed.run=true so
# SampleDataSeeder fires once and the app exits. Idempotent: it creates the
# canonical sample users (frodo, gandalf, aragorn), a few built-in themes and
# their public MCQ quiz decks only when absent, and gives every other existing
# user one private starter deck if they own none. Nothing is deleted.
#
# Pass --clear to drop the decks, themes and app_images collections and remove
# only the sample users (by username) before re-seeding — real accounts (e.g.
# your logged-in Google user) are preserved. Use this when a schema migration
# has left stale documents that Spring Data can't deserialize.

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
