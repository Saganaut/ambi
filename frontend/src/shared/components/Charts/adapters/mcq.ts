// MCQ → ChartDatum adapter. The single normalisation step between an MCQ's
// options + per-option response counts and the shape every renderer consumes.
// Used by the deck editor (with a synthetic sample distribution) and, later, by
// the live session board (with the real round-result tally) — same function,
// same output, so the preview an author sees matches the live render.
//
// Input options are typed structurally (`McqOptionLike`) rather than against the
// generated `McqOption`, so this shared module never imports from a feature.
import type { ChartDatum } from "../types";

export interface McqOptionLike {
  id: string;
  text?: string;
  color?: string;
}

/** A label that's never empty — falls back to positional "Option N". */
const optionLabel = (option: McqOptionLike, index: number): string => {
  const text = option.text?.trim();
  return text && text.length > 0 ? text : `Option ${(index + 1).toString()}`;
};

/**
 * Normalise an MCQ's options + a response tally into chart data, in author
 * order. Correct options are flagged for emphasis; each option's colour carries
 * through so charts can match the editor's option cards.
 */
export const mcqToChartData = (
  options: McqOptionLike[],
  correctOptionIds: string[],
  distribution: Record<string, number>,
): ChartDatum[] => {
  const correct = new Set(correctOptionIds);
  return options.map((option, index) => ({
    id: option.id,
    label: optionLabel(option, index),
    value: distribution[option.id] ?? 0,
    highlight: correct.has(option.id),
    color: option.color,
  }));
};

/**
 * A deterministic, believable response distribution for editor previews (there
 * are no real responses at authoring time). Deterministic so the preview is
 * stable across renders; weighted to descend by position with a bump for the
 * correct option(s) so the highlight reads as intentional.
 */
export const mcqSampleDistribution = (
  options: McqOptionLike[],
  correctOptionIds: string[],
): Record<string, number> => {
  const correct = new Set(correctOptionIds);
  const out: Record<string, number> = {};
  options.forEach((option, index) => {
    const base = Math.max(1, 12 - index * 3);
    out[option.id] = base + (correct.has(option.id) ? 7 : 0);
  });
  return out;
};
