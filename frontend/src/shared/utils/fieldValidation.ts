// Lightweight client-side field validation sourced from the generated
// `validationConstants.ts` (single source of truth: backend ValidationConstants
// → OpenAPI → validationConstants.ts). The backend re-validates everything and
// is authoritative; these checks are UX only — faster inline feedback and a
// native input cap kept in lockstep with the server. Bounds are never hardcoded
// here: callers pass a facet object straight from `validation.<Schema>.<field>`.

export interface FieldFacets {
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  items?: FieldFacets;
}

export interface ValidateTextOptions {
  /** Treat an empty/whitespace-only value as an error. */
  required?: boolean;
  /** Human label used in the required message (e.g. "Display name"). */
  label?: string;
  /** Domain-specific message shown when the value fails the pattern. */
  patternMessage?: string;
}

/** HTML attributes to spread onto an `<Input>` so its native cap matches the constraint. */
export const inputAttrs = (facets: FieldFacets): { maxLength?: number } =>
  facets.maxLength === undefined ? {} : { maxLength: facets.maxLength };

/**
 * Validate a string against the given facets, returning an error message or
 * `null`. Order: required → minLength → maxLength → pattern. An empty value that
 * isn't `required` passes (sparse edits leave the field untouched).
 *
 * The pattern is anchored (`^(?:…)$`) to mirror Jakarta `@Pattern`, which matches
 * the whole input — OpenAPI's `pattern` is otherwise an unanchored partial match.
 */
export function validateText(
  value: string,
  facets: FieldFacets,
  opts: ValidateTextOptions = {},
): string | null {
  const { required = false, label = "This field", patternMessage } = opts;

  if (value.trim().length === 0) {
    return required ? `${label} is required` : null;
  }
  if (facets.minLength !== undefined && value.length < facets.minLength) {
    return `Must be at least ${facets.minLength} characters`;
  }
  if (facets.maxLength !== undefined && value.length > facets.maxLength) {
    return `Must be ${facets.maxLength} characters or less`;
  }
  if (
    facets.pattern !== undefined &&
    !new RegExp(`^(?:${facets.pattern})$`).test(value)
  ) {
    return patternMessage ?? "Invalid format";
  }
  return null;
}
