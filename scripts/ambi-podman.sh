#!/usr/bin/env bash

# Podman variant of ambi.sh — starts the entire app in dev mode using Podman
# instead of Docker. See scripts/ambi.sh for the Docker version.
#
# Requires one of:
#   * docker-compose binary as Podman's compose provider (preferred — closest to
#     Docker behavior):  sudo dnf install docker-compose
#   * podman-compose (Python):                            sudo dnf install podman-compose
#
# Flags:
#   -f, --file-logs   Also write backend logs to backend/logs/ambi.log
#                     (activates the `filelog` Logback profile; console output
#                     is unaffected). See z-docs/runbooks/using-the-observability-stack.md.

FILE_LOGS=false
for arg in "$@"; do
  case "$arg" in
    -f|--file-logs) FILE_LOGS=true ;;
    -h|--help) echo "Usage: ./scripts/ambi-podman.sh [-f|--file-logs]"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; echo "Usage: ./scripts/ambi-podman.sh [-f|--file-logs]" >&2; exit 1 ;;
  esac
done

# Resolve repo root so the script works regardless of the caller's CWD.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# --- Pick a compose command -------------------------------------------------
# Prefer `podman compose` (delegates to the docker-compose provider) and fall
# back to standalone `podman-compose`.
if podman compose version >/dev/null 2>&1; then
  COMPOSE=(podman compose)
elif command -v podman-compose >/dev/null 2>&1; then
  COMPOSE=(podman-compose)
else
  echo "❌ No Podman compose provider found." >&2
  echo "   Install one of:" >&2
  echo "     sudo dnf install docker-compose   # preferred (use with: podman compose)" >&2
  echo "     sudo dnf install podman-compose    # standalone fallback" >&2
  exit 1
fi

# --- SELinux: let rootless containers read bind-mounted config --------------
# garage.toml is bind-mounted read-only; on an Enforcing system the container
# can't read it until it's relabeled with the container file type. chcon works
# without sudo because we own the file. No-op on non-SELinux hosts.
if command -v chcon >/dev/null 2>&1 && [ -f garage.toml ]; then
  chcon -t container_file_t garage.toml 2>/dev/null || true
fi

export AMBI_COMPOSE="${COMPOSE[*]}"

FRONTEND_PID=""
BACKEND_PID=""
STOPPING=false

# See scripts/ambi.sh for why SIGHUP is trapped and why teardown is delegated.
shutdown() {
  [ "$STOPPING" = true ] && return
  STOPPING=true
  trap '' SIGINT SIGTERM SIGHUP
  echo -e "\nStopping all services..."
  "$ROOT/scripts/ambi-stop.sh" ${FRONTEND_PID:+"$FRONTEND_PID"} ${BACKEND_PID:+"$BACKEND_PID"}
  exit 0
}
trap shutdown SIGINT SIGTERM SIGHUP

echo "🦭 Starting Podman containers (${COMPOSE[*]})..."

if ! "${COMPOSE[@]}" up -d; then
  echo "❌ Podman failed to start containers — aborting." >&2
  echo "   Podman is rootless/daemonless, so there's no daemon to start, but check:" >&2
  echo "     * the compose provider is installed (see header of this script)" >&2
  echo "     * ports aren't already in use (27017/6379/8001/3900/3903)" >&2
  echo "     * 'podman info' runs cleanly" >&2
  exit 1
fi

echo "   → Mongo Express:  http://localhost:8081
   → RedisInsight:   http://localhost:8001"

echo "⚛️ Starting Frontend..."

(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo "🍃 Starting Backend..."
if [ "$FILE_LOGS" = true ]; then
  echo "📝 File logging enabled → backend/logs/ambi.log"
fi
(
  set -a
  # The committed env file is .dev.env here; fall back to dev.env for parity
  # with ambi.sh / AGENTS.md.
  if [ -f .dev.env ]; then
    source .dev.env
  elif [ -f dev.env ]; then
    source dev.env
  else
    echo "⚠️  No .dev.env or dev.env found — backend will use application.properties defaults." >&2
  fi
  set +a
  if [ "$FILE_LOGS" = true ]; then
    export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:+$SPRING_PROFILES_ACTIVE,}filelog"
  fi
  cd backend
  ./mvnw spring-boot:run
) &
BACKEND_PID=$!

echo "🚀 All services are booting up! Press Ctrl+C to stop everything."

wait
shutdown
