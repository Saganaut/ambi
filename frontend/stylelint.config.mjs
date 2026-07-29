/** @type {import("stylelint").Config} */
export default {
  extends: ["stylelint-config-standard"],
  plugins: [
    "stylelint-value-no-unknown-custom-properties",
    "stylelint-declaration-strict-value",
  ],
  rules: {
    // Catch typos in var(--foo): every custom property must be defined in tokens.css.
    "csstools/value-no-unknown-custom-properties": [
      true,
      {
        importFrom: ["./src/tokens.css"],
      },
    ],

    // Force tokens for design-critical properties. Raw values (hex, oklch, px,
    // rem) are rejected — only var(--*) is allowed, plus a small allowlist of
    // CSS keywords that legitimately don't belong in the design system
    // (transparent, 0, auto, currentcolor, etc.).
    "scale-unlimited/declaration-strict-value": [
      [
        "/color$/",
        "fill",
        "stroke",
        "/^padding/",
        "/^margin/",
        "/^border-radius/",
        "/-radius$/",
        "gap",
        "row-gap",
        "column-gap",
        "font-size",
      ],
      {
        ignoreValues: [
          // Tokens are the goal.
          "/^var\\(--/",

          // clamp() / min() / max() that wrap token references are fine —
          // their inner values still get checked by csstools/value-no-unknown-custom-properties.
          "/^clamp\\(/",
          "/^min\\(/",
          "/^max\\(/",

          // oklch() literals are still occasionally needed for derived colors
          // (e.g. translucent surfaces); the design system itself uses them.
          "/^oklch\\(/",

          // rgb()/rgba() for scrims, overlays, shadows — these are pure alpha
          // operations on black/white and have no semantic token equivalent.
          "/^rgb\\(/",
          "/^rgba\\(/",

          // 1px borders / -1px sr-only tricks are accessibility plumbing, not
          // design choices. Same for the standard CSS keywords.
          "0",
          "1px",
          "-1px",
          "auto",
          "none",
          "inherit",
          "initial",
          "unset",
          "transparent",
          "currentcolor",
          "currentColor",
        ],
        ignoreFunctions: false,
        disableFix: true,
        severity: "error",
      },
    ],

    // Spacing must route through the semantic tiers (--gap-*, --p-*, --stack-*,
    // --gutter-*); raw --space-* is only for defining those tokens in tokens.css
    // and for true one-offs (absolute offsets, scroll margins), which live in
    // properties this rule doesn't cover. Warning severity while the sanctioned
    // leftovers are worked off; graduates to error once they're resolved.
    // See z-docs/rules/styling/spacing-hierarchy.md.
    "declaration-property-value-disallowed-list": [
      {
        "/^(padding|margin|gap|row-gap|column-gap)/": [/var\(--space-/],
      },
      {
        message:
          "Use semantic spacing tokens (--gap-*, --p-*, --stack-*, --gutter-*) instead of raw --space-* (spacing-hierarchy rule)",
      },
    ],

    // using lowerCamelCase for compatibility with css modules
    "selector-class-pattern": [
      "^[a-z][a-zA-Z0-9]+$",
      {
        message: "Expected class selector to be lowerCamelCase",
      },
    ],
    "selector-id-pattern": [
      "^[a-z][a-zA-Z0-9]+$",
      {
        message: "Expected id selector to be lowerCamelCase",
      },
    ],
  },
};
