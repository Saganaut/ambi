#!/usr/bin/env bash

# Script to start entire app in dev mode.
#
# Flags:
#   -f, --file-logs   Also write backend logs to backend/logs/ambi.log
#                     (activates the `filelog` Logback profile; console output
#                     is unaffected). See z-docs/runbooks/using-the-observability-stack.md.

FILE_LOGS=false
for arg in "$@"; do
  case "$arg" in
    -f|--file-logs) FILE_LOGS=true ;;
    -h|--help) echo "Usage: ./scripts/ambi.sh [-f|--file-logs]"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; echo "Usage: ./scripts/ambi.sh [-f|--file-logs]" >&2; exit 1 ;;
  esac
done

trap 'echo -e "\nStopping all services..."; kill 0; docker compose stop; exit' SIGINT SIGTERM

echo "🐳 Starting Docker containers..."

if ! docker compose up -d; then
  echo "❌ Docker failed to start containers — aborting." >&2
  echo "   Is the Docker daemon running and do you have access to it?" >&2
  echo "   If you were recently added to the 'docker' group, start a fresh" >&2
  echo "   login session (log out/in) or run 'newgrp docker' in this shell." >&2
  exit 1
fi

echo "   → Mongo Express:  http://localhost:8081
   → RedisInsight:   http://localhost:8001"

echo "⚛️ Starting Frontend..."

(cd frontend && npm run dev) &

echo "🍃 Starting Backend..."
if [ "$FILE_LOGS" = true ]; then
  echo "📝 File logging enabled → backend/logs/ambi.log"
fi
(
  set -a
  source dev.env
  set +a
  if [ "$FILE_LOGS" = true ]; then
    export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:+$SPRING_PROFILES_ACTIVE,}filelog"
  fi
  cd backend
  ./mvnw spring-boot:run
) &

echo "🚀 All services are booting up! Press Ctrl+C to stop everything."

wait