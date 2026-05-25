#!/usr/bin/env bash

# One-shot migration that backfills the chunk 20 profile additions:
#  - User.displayName = userName ?: name (where blank)
#  - User.notificationPrefs = NotificationPrefs.withDefaults() (where null),
#    with marketingEmail mirrored from the legacy User.newsletter flag
#  - Organization.emailDomain is lowercased so the OAuth auto-join hook
#    can do a case-insensitive lookup
#
# Loads dev.env, then runs the Spring Boot app with
# --migrate.user-profile=true so UserProfileBackfillMigration fires once and
# the app exits. Idempotent: skips records already in the post-migration shape.
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
  -Dspring-boot.run.arguments="--migrate.user-profile=true --server.port=0"
