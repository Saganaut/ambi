#!/usr/bin/env bash
# Runs all documentation checks: reachability (doc-lint) + markdown style (markdownlint).
set -e
REPO_ROOT="$(git rev-parse --show-toplevel)"

echo "▶ Doc reachability (orphan check)..."
# doc-lint.js resolves its config (tools/.doc-lintrc.json) and all doc paths
# relative to cwd, so it must run from the repo root.
(cd "$REPO_ROOT" && node tools/doc-lint.js)

echo "OK - Reachability passed."

echo "▶ Markdown style (markdownlint)..."
(cd "$REPO_ROOT" && npx --yes markdownlint-cli2)

echo "OK - Markdown style passed."

echo "📄 All documentation checks passed."
