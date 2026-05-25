// doc-lint.js — zero dependencies, Node.js built-ins only (requires Node 18+)
// Usage: node doc-lint.js [--config .doc-lintrc.json]

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, relative, dirname, resolve } from "path";

// ─── Config ──────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  rootDoc: "./z-docs/README.md",
  excludeFolders: ["node_modules", ".git"],
  excludeFiles: [],
  ignoreComment: "doc-lint-ignore",
};

function loadConfig() {
  const args = process.argv.slice(2);
  const configFlagIndex = args.indexOf("--config");
  const configPath =
    configFlagIndex !== -1
      ? args[configFlagIndex + 1]
      : "tools/.doc-lintrc.json";

  if (existsSync(configPath)) {
    try {
      const raw = JSON.parse(readFileSync(configPath, "utf8"));
      return { ...DEFAULT_CONFIG, ...raw };
    } catch {
      emit(
        configPath,
        1,
        1,
        "error",
        `Could not parse config file: ${configPath}`,
      );
      process.exit(1);
    }
  }

  return DEFAULT_CONFIG;
}

// ─── Output ──────────────────────────────────────────────────────────────────

function emit(file, line, col, severity, message) {
  console.log(`${file}:${line}:${col}: ${severity}: ${message}`);
}

// ─── File walking ─────────────────────────────────────────────────────────────

function findMarkdownFiles(dir, config) {
  const entries = readdirSync(dir, { recursive: true, withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const parent = entry.parentPath ?? entry.path;
    const rel = relative(dir, join(parent, entry.name)).replace(/\\/g, "/");
    if (!isExcluded(rel, config)) results.push(rel);
  }

  return results;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isExcluded(filePath, config) {
  for (const folder of config.excludeFolders) {
    if (filePath.startsWith(folder + "/") || filePath === folder) return true;
  }
  return config.excludeFiles.includes(filePath);
}

function hasIgnoreComment(filePath, config) {
  try {
    const lines = readFileSync(filePath, "utf8").split("\n").slice(0, 5);
    return lines.some((line) => line.includes(config.ignoreComment));
  } catch {
    return false;
  }
}

// Extract all local .md links from a file, resolved to project-root-relative paths
function extractLocalLinks(filePath) {
  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return [];
  }

  const pattern = /\[.*?\]\(([^)]+)\)/g;
  const links = [];
  let match;

  while ((match = pattern.exec(content)) !== null) {
    let href = match[1].split("#")[0].split("?")[0].trim();
    if (!href || href.startsWith("http://") || href.startsWith("https://"))
      continue;
    if (!href.endsWith(".md")) continue;

    // Resolve relative to the file that contains the link
    const resolved = relative(
      process.cwd(),
      resolve(dirname(filePath), href),
    ).replace(/\\/g, "/");

    links.push(resolved);
  }

  return links;
}

// ─── Graph traversal ─────────────────────────────────────────────────────────

function findReachableFiles(rootDoc) {
  const reachable = new Set();
  const queue = [rootDoc];

  while (queue.length > 0) {
    const current = queue.shift();
    if (reachable.has(current)) continue;
    reachable.add(current);

    const links = extractLocalLinks(current);
    for (const link of links) {
      if (!reachable.has(link) && existsSync(link)) {
        queue.push(link);
      }
    }
  }

  return reachable;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const config = loadConfig();
const rootDoc = config.rootDoc;

if (!existsSync(rootDoc)) {
  emit(rootDoc, 1, 1, "error", `Root doc '${rootDoc}' not found`);
  process.exit(1);
}

const allFiles = findMarkdownFiles(process.cwd(), config);

if (allFiles.length === 0) {
  console.log("doc-lint: no markdown files found");
  process.exit(0);
}

// Walk the link graph starting from rootDoc
const reachable = findReachableFiles(rootDoc);

// Any file not reachable and not carrying an ignore comment is orphaned
let errorCount = 0;

for (const file of allFiles) {
  if (reachable.has(file)) continue;
  if (hasIgnoreComment(file, config)) continue;

  emit(
    file,
    1,
    1,
    "error",
    `Orphaned — not reachable from ${rootDoc} via any chain of links`,
  );
  errorCount++;
}

if (errorCount > 0) {
  console.error(`\ndoc-lint: ${errorCount} orphaned file(s) found`);
  process.exit(1);
} else {
  console.log(
    `doc-lint: all ${allFiles.length} markdown files are reachable ✓`,
  );
  process.exit(0);
}
