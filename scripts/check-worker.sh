#!/usr/bin/env bash
# Lints and tests the Python image-variant worker (worker/) — ruff, then pytest.
#
# The repo is otherwise JVM + Node, so a Python toolchain is not a given. This
# script therefore self-provisions where it can and SKIPS (exit 0) where it
# can't, exactly like scripts/check-backend-lint.sh does when the Eclipse JDT
# batch compiler is absent: a missing toolchain must not block a commit, while a
# real ruff/pytest failure must.
#
# Provisioning order:
#   1. worker/.venv, if it already has ruff and pytest       -> used as-is
#   2. uv on PATH                                            -> uv venv + uv pip install
#   3. python3 on PATH                                       -> venv + pip install
#   4. neither                                               -> skip with a message
#
# Set AMBI_SKIP_WORKER_CHECK=1 to skip unconditionally.
#
# Exit status: 0 when clean or skipped, non-zero when ruff or pytest fail.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
WORKER="$REPO_ROOT/worker"
VENV="$WORKER/.venv"
PY="$VENV/bin/python"
RUFF="$VENV/bin/ruff"

skip() {
  echo "⚠ Skipping worker checks: $1" >&2
  exit 0
}

[[ "${AMBI_SKIP_WORKER_CHECK:-}" == "1" ]] && skip "AMBI_SKIP_WORKER_CHECK=1."
[[ -f "$WORKER/pyproject.toml" ]] || skip "no worker/pyproject.toml."

have_uv() { command -v uv >/dev/null 2>&1; }

# --- Provision worker/.venv --------------------------------------------------
if [[ ! -x "$PY" ]]; then
  if have_uv; then
    echo "▶ Creating worker/.venv (uv)..."
    (cd "$WORKER" && uv venv >/dev/null) || skip "uv could not create worker/.venv."
  elif command -v python3 >/dev/null 2>&1; then
    echo "▶ Creating worker/.venv (python3 -m venv)..."
    python3 -m venv "$VENV" || skip "python3 -m venv failed (is the venv module installed?)."
  else
    skip "no Python toolchain on PATH — install uv or python3 to run these checks."
  fi
fi

[[ -x "$PY" ]] || skip "worker/.venv has no Python interpreter."

# --- Install the dev extra when anything is missing ---------------------------
# Both tools are checked because a half-installed venv (interrupted install,
# an older tree predating the dev extra) would otherwise fail confusingly.
if [[ ! -x "$RUFF" ]] || ! "$PY" -m pytest --version >/dev/null 2>&1; then
  echo "▶ Installing worker dev dependencies..."
  if have_uv; then
    (cd "$WORKER" && VIRTUAL_ENV="$VENV" uv pip install --quiet -e ".[dev]") \
      || skip "could not install worker dependencies with uv (offline?)."
  else
    "$PY" -m pip install --quiet --upgrade pip >/dev/null 2>&1 || true
    "$PY" -m pip install --quiet -e "$WORKER[dev]" \
      || skip "could not install worker dependencies with pip (offline?)."
  fi
fi

[[ -x "$RUFF" ]] || skip "ruff is not installed in worker/.venv."

# --- Lint --------------------------------------------------------------------
echo "▶ Worker lint (ruff $("$RUFF" --version | awk '{print $2}'))..."
(cd "$WORKER" && "$RUFF" check .)
(cd "$WORKER" && "$RUFF" format --check .)

echo "OK - Worker lint passed."

# --- Test --------------------------------------------------------------------
echo "▶ Worker tests (pytest)..."
(cd "$WORKER" && "$PY" -m pytest)

echo "OK - Worker tests passed."
