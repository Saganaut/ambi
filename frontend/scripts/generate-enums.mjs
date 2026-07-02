// @ts-nocheck
/**
 * Generates the per-feature enum files (`src/features/<feature>/store/<feature>Enums.gen.ts`)
 * from the backend's live OpenAPI document. The backend emits every enum *inline*
 * (`{type:"string", enum:[…]}` on each property) with no name attached, so — like
 * `openapi-config.cts` does for endpoint→feature routing — a small registry below
 * supplies the canonical TS name + target feature for each enum we care about. The
 * enum *values* are read from the schema, keeping the backend the single source of
 * truth (same model as `generate-validation.mjs`).
 *
 * The backend must be running, and the output is committed. Run via
 * `npm run generate-enums` (or `npm run generate` to do the API client + validation
 * + this together). Override the source with `API_DOCS_URL=… npm run generate-enums`.
 *
 * Plain Node ESM on purpose — uses global `fetch` (Node 18+), no extra deps.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SCHEMA_URL =
  process.env.API_DOCS_URL ?? "http://localhost:8080/v3/api-docs";
const FEATURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/features",
);

/**
 * The enums to emit. `name` is the canonical TS name and `feature` the target
 * folder. Values come from one of two sources in the schema:
 *   - `prop: [SchemaName, fieldName]`  → that property's inline `enum` array
 *   - `discriminatorOf: SchemaName`    → the keys of that schema's discriminator mapping
 * `emitList` additionally emits `export const <emitList> = Object.values(<name>)`.
 *
 * Add a line here to generate a new enum (see the schema's `components.schemas`).
 */
const ENUMS = [
  {
    name: "PublishStatus",
    feature: "deck",
    prop: ["DeckResponse", "publishStatus"],
  },
  {
    name: "DeckVisibility",
    feature: "deck",
    prop: ["DeckResponse", "visibility"],
  },
  {
    name: "SlideType",
    feature: "deck",
    discriminatorOf: "SlideContent",
    emitList: "SLIDE_TYPE_LIST",
  },
  {
    name: "Difficulty",
    feature: "deck",
    prop: ["SlideResponse", "difficulty"],
  },
  { name: "ScoreMode", feature: "deck", prop: ["NumberContent", "scoreMode"] },
  {
    name: "McqDataVisualization",
    feature: "deck",
    prop: ["McqContent", "dataVisualization"],
  },
  {
    // Set<DisplayLocation> — the enum values live on the array's `items`.
    name: "DisplayLocation",
    feature: "deck",
    prop: ["InviteSettings", "qrLocations"],
  },
  {
    name: "ResultsDisplayMode",
    feature: "deck",
    prop: ["AnswerSettings", "displayResultsMode"],
  },
  {
    name: "FollowUpMode",
    feature: "deck",
    prop: ["FollowUpContent", "mode"],
    emitList: "FOLLOW_UP_MODE_LIST",
  },
  {
    name: "SlideBlockKind",
    feature: "deck",
    discriminatorOf: "SlideBlock",
    emitList: "SLIDE_BLOCK_KIND_LIST",
  },
  {
    name: "CalloutTone",
    feature: "deck",
    prop: ["CalloutBlock", "tone"],
    emitList: "CALLOUT_TONE_LIST",
  },
  {
    name: "ThemeAppearance",
    feature: "theme",
    prop: ["ThemeSpec", "appearance"],
  },
  { name: "UserLevel", feature: "auth", prop: ["RegisteredMe", "userLevel"] },
  {
    name: "MembershipTier",
    feature: "auth",
    prop: ["RegisteredMe", "effectiveTier"],
  },
  {
    name: "MembershipStatus",
    feature: "auth",
    prop: ["RegisteredMe", "membershipStatus"],
  },
  {
    // Map key enum — exposed via OpenApiConfig.exposeMapKeyEnums(), not a property.
    name: "ImageSizeOptions",
    feature: "gallery",
    component: "ImageSizeOptions",
  },
];

/** Resolve the (sorted, de-duped) string values for one registry entry. */
function resolveValues(entry, schemas) {
  let raw;
  if (entry.prop) {
    const [schemaName, fieldName] = entry.prop;
    const prop = schemas[schemaName]?.properties?.[fieldName];
    if (!prop) {
      throw new Error(
        `Enum "${entry.name}": ${schemaName}.${fieldName} not found in the schema. ` +
          `Did the backend rename it? Update the ENUMS registry in scripts/generate-enums.mjs.`,
      );
    }
    // A scalar enum field carries `enum` directly; a Set/array of an enum
    // (e.g. Set<DisplayLocation>) carries it on the array's `items`.
    raw = prop.enum ?? prop.items?.enum;
    if (!Array.isArray(raw)) {
      throw new Error(
        `Enum "${entry.name}": ${schemaName}.${fieldName} has no \`enum\` array ` +
          `(checked the property and its \`items\`).`,
      );
    }
  } else if (entry.component) {
    const schema = schemas[entry.component];
    if (!schema) {
      throw new Error(
        `Enum "${entry.name}": component schema "${entry.component}" not found. ` +
          `Is it registered in OpenApiConfig.exposeMapKeyEnums()?`,
      );
    }
    raw = schema.enum;
    if (!Array.isArray(raw)) {
      throw new Error(
        `Enum "${entry.name}": component schema "${entry.component}" has no \`enum\` array.`,
      );
    }
  } else if (entry.discriminatorOf) {
    const mapping = schemas[entry.discriminatorOf]?.discriminator?.mapping;
    if (!mapping) {
      throw new Error(
        `Enum "${entry.name}": ${entry.discriminatorOf} has no \`discriminator.mapping\`. ` +
          `Update the ENUMS registry in scripts/generate-enums.mjs.`,
      );
    }
    raw = Object.keys(mapping);
  } else {
    throw new Error(
      `Enum "${entry.name}": registry entry needs \`prop\`, \`component\`, or \`discriminatorOf\`.`,
    );
  }
  // Sort for deterministic, minimal diffs on regeneration.
  return [...new Set(raw)].sort();
}

/** Render one enum's `type` + `const` (+ optional list) block. */
function renderEnum(entry, values) {
  const union = values.map((v) => `"${v}"`).join(" | ");
  const members = values.map((v) => `  ${v}: "${v}",`).join("\n");
  let block =
    `export type ${entry.name} = ${union};\n` +
    `export const ${entry.name} = {\n${members}\n} as const satisfies Record<${entry.name}, ${entry.name}>;\n`;
  if (entry.emitList) {
    block += `\nexport const ${entry.emitList} = Object.values(${entry.name}) as ${entry.name}[];\n`;
  }
  return block;
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

  // Group rendered blocks by feature (registry order within each feature).
  const byFeature = {};
  for (const entry of ENUMS) {
    const values = resolveValues(entry, schemas);
    (byFeature[entry.feature] ??= []).push(renderEnum(entry, values));
  }

  const written = [];
  for (const [feature, blocks] of Object.entries(byFeature)) {
    const outPath = resolve(
      FEATURES_DIR,
      feature,
      "store",
      `${feature}Enums.gen.ts`,
    );
    const header =
      `// AUTO-GENERATED by scripts/generate-enums.mjs from the backend OpenAPI\n` +
      `// schema (/v3/api-docs). DO NOT EDIT BY HAND — run \`npm run generate-enums\`\n` +
      `// after changing the backend enums. Names + feature placement are defined in\n` +
      `// the ENUMS registry in that script; the values come from the live schema.\n\n`;
    writeFileSync(outPath, header + blocks.join("\n"));
    written.push({ outPath, count: blocks.length });
  }

  for (const { outPath, count } of written) {
    console.log(`Wrote ${outPath} (${count} enum${count === 1 ? "" : "s"}).`);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
