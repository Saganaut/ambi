#!/usr/bin/env bash

# One-off migration backfilling the participants' durable admission marker.
#
# Loads dev.env, then runs the Spring Boot app with
# --migrate.participantAdmittedAt.run=true so ParticipantAdmittedAtMigration
# fires once and the app exits. Roster membership now requires a durable
# `admitted_at` on the participant document (a document without it is a join
# still in flight), so every pre-existing participant is stamped with
# `admitted_at = joined_at` — falling back to now for the odd document that has
# no join timestamp. Run this BEFORE booting the new backend: until it has run,
# pre-existing participants are invisible to every roster read.
#
# Idempotent: the absence of `admitted_at` is the sole marker of an un-migrated
# document and the migration sets it, so a second run matches nothing and no
# existing timestamp is rewritten. Nothing is deleted.
#
# Pass --dry-run to log the affected count without writing anything.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

EXTRA_ARGS=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) EXTRA_ARGS="$EXTRA_ARGS --migrate.participantAdmittedAt.dryRun=true" ;;
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
  -Dspring-boot.run.arguments="--migrate.participantAdmittedAt.run=true --server.port=0${EXTRA_ARGS}"
