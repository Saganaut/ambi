#!/usr/bin/env bash

# Stops the Ambi dev stack — including processes this script did not start.
#
# `ambi.sh`'s Ctrl+C trap can only reach its own children, so a backend started
# detached (e.g. `nohup ./mvnw spring-boot:run &`) outlives it and keeps holding
# port 8080. This script reaps by port and by command line instead of by
# parentage, so those orphans get cleaned up too.
#
# Usage: ./scripts/ambi-stop.sh [--keep-containers] [PID ...]
#
#   --keep-containers   Leave Mongo/Redis/Garage running; only stop app processes.
#   PID ...             Extra process trees to reap. `ambi.sh` passes its own
#                       background jobs so their wrapper shells go too.
#
# Set AMBI_COMPOSE to override the compose command (e.g. "podman compose").
#
# Exits 0 when there was nothing to stop. See
# z-docs/runbooks/running-the-project.md.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

DEV_PORTS=(8080 5173)
TERM_GRACE_SECONDS=10

usage() {
  echo "Usage: ./scripts/ambi-stop.sh [--keep-containers] [PID ...]"
}

KEEP_CONTAINERS=false
SEEDS=()
for arg in "$@"; do
  case "$arg" in
    --keep-containers) KEEP_CONTAINERS=true ;;
    -h|--help) usage; exit 0 ;;
    [0-9]*) SEEDS+=("$arg") ;;
    *) echo "Unknown option: $arg" >&2; usage >&2; exit 1 ;;
  esac
done

# Command-line patterns are anchored on this checkout's absolute paths so a
# second clone — or an unrelated JVM/node process — is never matched.
PATTERNS=(
  "maven[.]multiModuleProjectDirectory=$ROOT/backend"
  "$ROOT/backend/target/classes.*AmbiApplication"
  "$ROOT/frontend/node_modules/[.]bin/vite"
  "$ROOT/frontend/node_modules/vite/bin/vite[.]js"
)

listeners_on() {
  local port=$1
  if command -v ss >/dev/null 2>&1; then
    ss -tlnpH "sport = :$port" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2
  elif command -v lsof >/dev/null 2>&1; then
    lsof -ti "tcp:$port" -sTCP:LISTEN 2>/dev/null
  fi
}

descendants_of() {
  local pid=$1 child
  for child in $(pgrep -P "$pid" 2>/dev/null); do
    echo "$child"
    descendants_of "$child"
  done
}

self_lineage() {
  local pid=$$
  while [ -n "$pid" ] && [ "$pid" -gt 1 ]; do
    echo "$pid"
    pid="$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')"
  done
}

describe() {
  local pid=$1 cmd
  cmd="$(ps -o args= -p "$pid" 2>/dev/null | tr -s ' ')"
  echo "   • ${pid}  ${cmd:0:96}"
}

mapfile -t PROTECTED < <(self_lineage)
is_protected() {
  local pid=$1 guarded
  for guarded in "${PROTECTED[@]}"; do
    [ "$pid" = "$guarded" ] && return 0
  done
  return 1
}

collect_targets() {
  local port pattern pid
  for pid in "${SEEDS[@]+"${SEEDS[@]}"}"; do
    kill -0 "$pid" 2>/dev/null && echo "$pid"
  done
  for port in "${DEV_PORTS[@]}"; do
    listeners_on "$port"
  done
  for pattern in "${PATTERNS[@]}"; do
    pgrep -f -- "$pattern" 2>/dev/null
  done
}

mapfile -t SEEN < <(collect_targets | sort -u)

TARGETS=()
for pid in "${SEEN[@]+"${SEEN[@]}"}"; do
  [ -n "$pid" ] || continue
  is_protected "$pid" && continue
  TARGETS+=("$pid")
  while read -r child; do
    [ -n "$child" ] || continue
    is_protected "$child" && continue
    TARGETS+=("$child")
  done < <(descendants_of "$pid")
done

mapfile -t TARGETS < <(printf '%s\n' "${TARGETS[@]+"${TARGETS[@]}"}" | sort -u | grep -v '^$')

if [ "${#TARGETS[@]}" -gt 0 ]; then
  echo "🛑 Stopping ${#TARGETS[@]} app process(es)..."
  for pid in "${TARGETS[@]}"; do
    describe "$pid"
  done

  kill -TERM "${TARGETS[@]}" 2>/dev/null

  # Give Spring's shutdown hook time to close Mongo/Redis/S3 clients *before*
  # the containers go away — tearing the stack down first makes shutdown hang.
  deadline=$((SECONDS + TERM_GRACE_SECONDS))
  while [ "$SECONDS" -lt "$deadline" ]; do
    alive=false
    for pid in "${TARGETS[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        alive=true
        break
      fi
    done
    [ "$alive" = false ] && break
    sleep 0.2
  done

  SURVIVORS=()
  for pid in "${TARGETS[@]}"; do
    kill -0 "$pid" 2>/dev/null && SURVIVORS+=("$pid")
  done
  if [ "${#SURVIVORS[@]}" -gt 0 ]; then
    echo "⚠️  ${#SURVIVORS[@]} process(es) ignored SIGTERM after ${TERM_GRACE_SECONDS}s — sending SIGKILL:"
    for pid in "${SURVIVORS[@]}"; do
      describe "$pid"
    done
    kill -KILL "${SURVIVORS[@]}" 2>/dev/null
    sleep 0.5
  fi
else
  echo "✅ No Ambi app processes running."
fi

if [ "$KEEP_CONTAINERS" = false ]; then
  read -ra COMPOSE_CMD <<< "${AMBI_COMPOSE:-docker compose}"
  echo "🐳 Stopping containers (${COMPOSE_CMD[*]})..."
  if ! "${COMPOSE_CMD[@]}" stop; then
    echo "⚠️  '${COMPOSE_CMD[*]} stop' failed — containers may still be running." >&2
  fi
fi

STILL_HELD=()
for port in "${DEV_PORTS[@]}"; do
  while read -r pid; do
    [ -n "$pid" ] && STILL_HELD+=("$port/$pid")
  done < <(listeners_on "$port")
done

if [ "${#STILL_HELD[@]}" -gt 0 ]; then
  echo "❌ Dev ports still in use: ${STILL_HELD[*]}" >&2
  echo "   Those listeners aren't recognisable as Ambi processes — inspect with:" >&2
  echo "     ss -tlnp | grep -E '8080|5173'" >&2
  exit 1
fi

echo "🧹 Dev ports 8080 and 5173 are free."
