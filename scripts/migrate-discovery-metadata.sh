#!/usr/bin/env bash

# One-shot migration that backfills the discovery metadata fields added in
# chunk 02 (publishStatus, publishedAt, language, difficulty, license).
#
# Loads dev.env, then runs the Spring Boot app with
# --migrate.discovery-metadata=true so DiscoveryMetadataMigration fires once
# and the app exits. Idempotent: only fills nulls — existing values are
# never overwritten.
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
  -Dspring-boot.run.arguments="--migrate.discovery-metadata=true --server.port=0"
