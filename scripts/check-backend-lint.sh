#!/usr/bin/env bash
# Reproduces the IDE's Eclipse JDT null-analysis warnings on the CLI, so the
# backend Problems-panel warnings (unused imports, "needs unchecked conversion
# via method descriptor", etc.) can be enforced outside the editor.
#
# javac does NOT surface these — they come from the Eclipse JDT compiler running
# with the project's annotation-based null analysis (see the VS Code setting
# "java.compile.nullAnalysis.mode" and backend/.settings/org.eclipse.jdt.core.prefs,
# which point @NonNull/@Nullable at Spring's annotations). This script runs the
# same JDT batch compiler the Red Hat Java extension uses, with the same prefs,
# and with Lombok wired in as a Java agent so generated accessors resolve.
#
# Exit status: 0 when there are zero JDT problems, 1 otherwise.
#
# Requirements:
#   - The Red Hat Java extension (its bundled JDT batch compiler is auto-detected),
#     OR set ECJ_JAR to an org.eclipse.jdt.core.compiler.batch_*.jar that supports
#     the project's Java release. Maven Central's org.eclipse.jdt:ecj is NOT used
#     by default: the published builds under-report the source-26 method-descriptor
#     warnings the IDE shows.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
BACKEND="$REPO_ROOT/backend"
PREFS="$BACKEND/.settings/org.eclipse.jdt.core.prefs"

RELEASE="$(sed -n 's/^org.eclipse.jdt.core.compiler.source=//p' "$PREFS")"
RELEASE="${RELEASE:-26}"

# --- Locate the Eclipse JDT batch compiler -----------------------------------
# Priority: $ECJ_JAR override, then the newest batch jar shipped by the Red Hat
# Java extension across the usual VS Code / VS Code Server / code-server layouts.
if [[ -n "${ECJ_JAR:-}" && -f "${ECJ_JAR}" ]]; then
  ECJ="$ECJ_JAR"
else
  ECJ="$(find "$HOME"/.vscode*/extensions "$HOME"/.cursor*/extensions \
              "$HOME"/.config/Code*/User/globalStorage 2>/dev/null \
           -path '*redhat.java-*' -name 'org.eclipse.jdt.core.compiler.batch_*.jar' \
         | sort -V | tail -1 || true)"
fi
if [[ -z "${ECJ:-}" || ! -f "$ECJ" ]]; then
  # Skip (not fail): the JDT batch compiler ships with the Red Hat Java
  # extension, which is present on dev machines but not in headless CI. A
  # missing compiler must not block commits — the IDE still surfaces these.
  echo "⚠ Skipping backend null-analysis: Eclipse JDT batch compiler not found." >&2
  echo "  Install the Red Hat Java extension, or set ECJ_JAR to a" >&2
  echo "  org.eclipse.jdt.core.compiler.batch_*.jar supporting Java $RELEASE." >&2
  exit 0
fi

echo "▶ Backend null-analysis (Eclipse JDT $(basename "$ECJ"))..."

# --- Build the compile classpath (includes Lombok) ---------------------------
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
(cd "$BACKEND" && ./mvnw -q dependency:build-classpath \
    -Dmdep.includeScope=test -Dmdep.outputFile="$TMP/cp.txt")
CP="$(cat "$TMP/cp.txt")"

# Lombok lives on that classpath; run it as an agent so @Getter/@Builder/etc.
# members exist during analysis (mirrors how the IDE's Lombok support works).
LOMBOK="$(tr ':' '\n' <<<"$CP" | grep -m1 '/lombok-[0-9].*\.jar$' || true)"
if [[ -z "$LOMBOK" ]]; then
  echo "✗ Could not find Lombok on the backend classpath." >&2
  exit 1
fi

# --- Gather sources ----------------------------------------------------------
find "$BACKEND/src/main/java" "$BACKEND/src/test/java" -name '*.java' > "$TMP/srcs.txt"

# --- Run the analysis --------------------------------------------------------
# -proc:none: Lombok runs via the agent, not as an annotation processor.
# JVM "WARNING:" lines (Lombok's use of sun.misc.Unsafe) are filtered out.
set +e
java -javaagent:"$LOMBOK"=ECJ -jar "$ECJ" \
  -cp "$CP" -source "$RELEASE" -target "$RELEASE" \
  -properties "$PREFS" -proc:none -d none \
  @"$TMP/srcs.txt" 2>&1 | grep -v '^WARNING: ' > "$TMP/out.txt"
set -e

# ecj prints a trailing "N problem(s) (...)" summary only when N > 0.
SUMMARY="$(grep -E '^[0-9]+ problems? ' "$TMP/out.txt" | tail -1 || true)"
COUNT="$(sed -n 's/^\([0-9]\+\) problems\? .*/\1/p' <<<"$SUMMARY")"

if [[ -n "$COUNT" && "$COUNT" -gt 0 ]]; then
  # Print the full findings so they can be acted on, then fail.
  grep -vE '^[0-9]+ problems? ' "$TMP/out.txt"
  echo ""
  echo "✗ $SUMMARY"
  exit 1
fi

echo "OK - No backend null-analysis warnings."
