#!/usr/bin/env bash

# One-shot migration that renames the top-level recommendedPreset →
# defaultSessionFormat field on every deck. Lets the back-compat
# @Field/@JsonProperty/@JsonAlias annotations on Deck.defaultSessionFormat be
# removed.
#
# Loads dev.env, then runs the Spring Boot app with
# --migrate.recommended-preset=true so
# cephadex.ambi.config.RecommendedPresetRenameMigration fires once and the
# app exits. Idempotent: once the legacy field is gone the filter matches
# nothing on subsequent runs.
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
  -Dspring-boot.run.arguments="--migrate.recommended-preset=true --server.port=0"
