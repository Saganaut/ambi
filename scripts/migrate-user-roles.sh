#!/usr/bin/env bash

# One-shot migration that backfills the `roles` field on existing user
# documents to [USER] (chunk 20 — User additions).
#
# Loads dev.env, then runs the Spring Boot app with
# --migrate.user-roles=true so UserRoleBackfillMigration fires once and the
# app exits. Idempotent: only documents missing the `roles` field are
# touched, so existing MODERATOR / ADMIN grants survive a re-run.
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
  -Dspring-boot.run.arguments="--migrate.user-roles=true --server.port=0"
