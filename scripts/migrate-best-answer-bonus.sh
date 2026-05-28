#!/usr/bin/env bash

# One-shot migration that renames elements[].bestAnswerBonus →
# elements[].bestAnswerPoints inside every deck. Lets the back-compat
# @Field("bestAnswerBonus") annotations on the question records be removed.
#
# Loads dev.env, then runs the Spring Boot app with
# --migrate.best-answer-bonus=true so
# cephadex.ambi.config.BestAnswerBonusRenameMigration fires once and the
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
  -Dspring-boot.run.arguments="--migrate.best-answer-bonus=true --server.port=0"
