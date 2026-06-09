// @ts-check
/**
 * Generates the per-feature `*ValidationConstants.ts` files from the backend's
 * live OpenAPI document. SpringDoc projects the Jakarta validation annotations
 * (which reference the backend's `ValidationConstants`) into the schema as
 * `maxLength`/`minLength`/`minimum`/`maximum`/`pattern` (+ array `min/maxItems`),
 * and this script lifts exactly those facets into typed TS constants files.
 *
 * The split mirrors `openapi-config.cts` (the `generate-api` half): each request
 * DTO is routed to a feature by the controller TAG of the operations that use it
 * (transitively, including nested DTOs). One `<feature>ValidationConstants.ts` is
 * written per feature, co-located with that feature's generated API under
 * `src/features/<feature>/store/`, exporting `<feature>Validation`. DTOs used by
 * two or more features (e.g. `Pageable`) go to a single shared file under
 * `src/shared/store/sharedValidationConstants.ts` exporting `sharedValidation`.
 *
 * Same model as `generate-api`: the backend must be running, and the output is
 * committed. Run via `npm run generate-validation` (or `npm run generate` to do
 * the API client + this together). Override the source with
 * `API_DOCS_URL=… npm run generate-validation`.
 *
 * Plain Node ESM on purpose — uses global `fetch` (Node 18+), no extra deps.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SCHEMA_URL = process.env.API_DOCS_URL ?? "http://localhost:8080/v3/api-docs";
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

// Controller tag → feature. Keep in sync with `openapi-config.cts` (tagToFeatureMap).
const TAG_TO_FEATURE = {
  "gallery-controller": "gallery",
  "image-controller": "gallery",
  "deck-controller": "deck",
  "comment-thread-controller": "deck",
  "slide-controller": "deck",
  "user-controller": "auth",
  "auth-controller": "auth",
  "theme-controller": "theme",
  "org-controller": "org",
};
// Operation-id overrides. Keep in sync with `openapi-config.cts` (specialCasesMap).
const SPECIAL_CASES = {
  updatePreferences: "account",
};

/** Where a feature's constants file lives, plus its export/type names. */
function featureFile(feature) {
  const Cap = feature.charAt(0).toUpperCase() + feature.slice(1);
  return {
    path: resolve(SCRIPT_DIR, `../src/features/${feature}/store/${feature}ValidationConstants.ts`),
    exportName: `${feature}Validation`,
    typeName: `${Cap}Validation`,
    label: feature,
  };
}
const SHARED_FILE = {
  path: resolve(SCRIPT_DIR, "../src/shared/store/sharedValidationConstants.ts"),
  exportName: "sharedValidation",
  typeName: "SharedValidation",
  label: "shared",
};

/** Validation facets we care about, in a stable order. */
const STRING_NUMBER_FACETS = [
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "pattern",
];
const ARRAY_FACETS = ["minItems", "maxItems"];

/** Pull the present facets off a single schema-property node (recurses into array items). */
function pickFacets(node) {
  if (!node || typeof node !== "object") return null;
  const out = {};
  for (const key of STRING_NUMBER_FACETS) {
    if (node[key] === undefined) continue;
    // `minLength: 0` is Jakarta's @Size default — emitted for every `@Size(max=…)`
    // and always true, so it's noise. (`minimum`/`maximum` are kept even at 0:
    // those come from an explicit @Min/@Max and are real numeric floors.)
    if (key === "minLength" && node[key] === 0) continue;
    out[key] = node[key];
  }
  for (const key of ARRAY_FACETS) {
    if (node[key] === undefined) continue;
    if (key === "minItems" && node[key] === 0) continue;
    out[key] = node[key];
  }
  if (node.items) {
    const items = pickFacets(node.items);
    if (items) out.items = items;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Build a sorted-key object so regeneration produces minimal diffs. */
function sortedEntries(obj) {
  return Object.keys(obj)
    .sort()
    .map((k) => [k, obj[k]]);
}

/** Schema name behind a local `$ref`, or null. */
function refName(ref) {
  const prefix = "#/components/schemas/";
  return typeof ref === "string" && ref.startsWith(prefix) ? ref.slice(prefix.length) : null;
}

/**
 * Walk a schema node, accumulating every component schema reachable from it into
 * `acc` (the closure). `schemas` is the components map; `seen` guards cycles.
 */
function collectRefs(node, schemas, acc, seen) {
  if (!node || typeof node !== "object") return;
  const name = refName(node.$ref);
  if (name) {
    if (!seen.has(name)) {
      seen.add(name);
      acc.add(name);
      collectRefs(schemas[name], schemas, acc, seen);
    }
    return;
  }
  for (const key of ["items", "additionalProperties"]) {
    if (node[key]) collectRefs(node[key], schemas, acc, seen);
  }
  for (const key of ["allOf", "anyOf", "oneOf"]) {
    if (Array.isArray(node[key])) node[key].forEach((n) => collectRefs(n, schemas, acc, seen));
  }
  if (node.properties) {
    for (const prop of Object.values(node.properties)) collectRefs(prop, schemas, acc, seen);
  }
}

/** Feature an operation belongs to (special-cased by operationId, else by first tag). */
function featureForOperation(op) {
  if (op.operationId && SPECIAL_CASES[op.operationId]) return SPECIAL_CASES[op.operationId];
  const tag = Array.isArray(op.tags) ? op.tags[0] : undefined;
  return tag ? TAG_TO_FEATURE[tag] : undefined;
}

/** Render one constants file. */
function renderFile({ exportName, typeName }, schemaMap) {
  const ordered = Object.fromEntries(sortedEntries(schemaMap));
  const body = JSON.stringify(ordered, null, 2);
  return `// AUTO-GENERATED by scripts/generate-validation.mjs from the backend OpenAPI
// schema (/v3/api-docs). DO NOT EDIT BY HAND — run \`npm run generate-validation\`
// after changing the backend's ValidationConstants / DTO constraints.
//
// Validation bounds are authored once in the backend
// (com.cephadex.ambi.common.validation.ValidationConstants), surfaced via Jakarta
// annotations into OpenAPI, and lifted here so the frontend shares one source of
// truth. Request DTOs are split per feature (mirroring openapi-config.cts); DTOs
// used by 2+ features live in sharedValidationConstants.ts. Keys are OpenAPI schema
// names; values are the per-field facets present.

export const ${exportName} = ${body} as const;

export type ${typeName} = typeof ${exportName};
`;
}

function writeFile(target, schemaMap) {
  mkdirSync(dirname(target.path), { recursive: true });
  writeFileSync(target.path, renderFile(target, schemaMap));
  console.log(
    `Wrote ${target.path} (${Object.keys(schemaMap).length} schema${
      Object.keys(schemaMap).length === 1 ? "" : "s"
    }).`,
  );
}

async function main() {
  const res = await fetch(SCHEMA_URL).catch((err) => {
    throw new Error(
      `Could not fetch the OpenAPI schema from ${SCHEMA_URL} — is the backend running? (${err.message})`,
    );
  });
  if (!res.ok) {
    throw new Error(`Fetching ${SCHEMA_URL} returned HTTP ${res.status}`);
  }
  const doc = await res.json();
  const schemas = doc?.components?.schemas ?? {};

  // 1. Every component schema that carries at least one validation facet.
  const faceted = {};
  for (const [schemaName, schema] of Object.entries(schemas)) {
    if (!schema || !schema.properties) continue;
    const fields = {};
    for (const [propName, prop] of Object.entries(schema.properties)) {
      const facets = pickFacets(prop);
      if (facets) fields[propName] = facets;
    }
    if (Object.keys(fields).length > 0) {
      faceted[schemaName] = Object.fromEntries(sortedEntries(fields));
    }
  }

  // 2. Per-feature closure of schemas reachable from each feature's request bodies
  //    and parameters (the same tag→feature routing `generate-api` uses).
  /** @type {Record<string, Set<string>>} */
  const closure = {};
  for (const pathItem of Object.values(doc?.paths ?? {})) {
    for (const op of Object.values(pathItem ?? {})) {
      if (!op || typeof op !== "object") continue;
      const feature = featureForOperation(op);
      if (!feature) continue;
      const acc = (closure[feature] ??= new Set());
      const seeds = [];
      if (op.requestBody?.content) {
        for (const media of Object.values(op.requestBody.content)) {
          if (media?.schema) seeds.push(media.schema);
        }
      }
      if (Array.isArray(op.parameters)) {
        for (const param of op.parameters) if (param?.schema) seeds.push(param.schema);
      }
      for (const seed of seeds) collectRefs(seed, schemas, acc, new Set());
    }
  }

  // 3. Route each faceted schema: 1 feature → that file, ≥2 → shared, 0 → shared (+warn).
  /** @type {Record<string, Record<string, unknown>>} */
  const byFeature = {};
  const shared = {};
  const orphans = [];
  for (const [name, facets] of Object.entries(faceted)) {
    const features = Object.keys(closure).filter((f) => closure[f].has(name));
    if (features.length === 1) {
      (byFeature[features[0]] ??= {})[name] = facets;
    } else if (features.length >= 2) {
      shared[name] = facets;
    } else {
      shared[name] = facets;
      orphans.push(name);
    }
  }

  // 4. Emit. Skip features with no faceted DTOs (e.g. org/account) — log them.
  const featuresSeen = Object.keys(closure).sort();
  for (const feature of featuresSeen) {
    const schemaMap = byFeature[feature];
    if (schemaMap && Object.keys(schemaMap).length > 0) {
      writeFile(featureFile(feature), schemaMap);
    } else {
      console.log(`Skipped ${feature} (no DTOs with validation facets).`);
    }
  }
  if (Object.keys(shared).length > 0) writeFile(SHARED_FILE, shared);
  if (orphans.length > 0) {
    console.warn(
      `Note: ${orphans.length} faceted schema(s) not reachable from any feature's requests, routed to shared: ${orphans
        .sort()
        .join(", ")}`,
    );
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
