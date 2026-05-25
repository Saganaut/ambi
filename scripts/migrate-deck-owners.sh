#!/usr/bin/env bash

# One-shot migration that backfills an OWNER row in the deck_collaborators
# collection for every existing deck (chunk 06 — deck collaborators).
#
# Loads dev.env, then runs the Spring Boot app with
# --migrate.deck-owners=true so DeckOwnerBackfillMigration fires once and the
# app exits. Idempotent: rows that already exist are left untouched.
#
# Stop any running backend first.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ -f "${PROJECT_ROOT}/dev.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "${PROJECT_ROOT}/dev.env" 2>/dev/null || true
  set +a
fi

cd "${PROJECT_ROOT}/backend"
./mvnw spring-boot:run \
  -Dspring-boot.run.arguments="--migrate.deck-owners=true --server.port=0"
