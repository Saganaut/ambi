#!/usr/bin/env bash

# One-shot migration that promotes the legacy free-form Deck.tags strings into
# first-class Tag documents (and populates Deck.tagIds).
#
# Loads dev.env, then runs the Spring Boot app with --migrate.legacy-tags=true
# so cephadex.ambi.config.LegacyTagMigration fires once and the app
# exits. Idempotent: decks with tagIds already populated are skipped; Tag
# documents are upserted by slug.
#
# Stop any running backend first (this script boots its own short-lived
# Spring Boot process). Safe to re-run.

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
  -Dspring-boot.run.arguments="--migrate.legacy-tags=true --server.port=0"
