// MCQ → ChartDatum adapter. The single normalisation step between an MCQ's
// options + per-option response counts and the shape every renderer consumes.
// Used by the deck editor (with a synthetic sample distribution) and, later, by
// the live session board (with the real round-result tally) — same function,
// same output, so the preview an author sees matches the live render.
//
// Options are typed against the shared `McqOption` (re-exported through the
// shared types barrel, not pulled directly from a feature), so spreading an
// option carries its text, image, and colour straight onto the `ChartDatum`
// every renderer consumes.
import type { McqOption } from "@/shared/types/elements";
import type { ChartDatum } from "../types";

/** The option fields a chart needs; structurally the editor's `McqOption`. */
export type McqOptionLike = McqOption;

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
  return options.map((option) => ({
    ...option,
    value: distribution[option.id] ?? 0,
    highlight: correct.has(option.id),
    isCorrect: correct.has(option.id),
  }));
};

/**
 * A deterministic, believable response distribution for editor previews (there
 * are no real responses at authoring time). Deterministic so the preview is
 * stable across renders; weighted to descend by position only. Correctness is
 * deliberately NOT a factor here — it drives `highlight` in {@link mcqToChartData},
 * so folding it into the value too would make toggling an option correct resize
 * its bar/segment, which is confusing while authoring.
 */
export const mcqSampleDistribution = (options: McqOptionLike[]): Record<string, number> => {
  const out: Record<string, number> = {};
  options.forEach((option, index) => {
    out[option.id] = Math.max(1, 12 - index * 3);
  });
  return out;
};

/**
 * A random preview distribution — each option gets a fresh integer in [0, max].
 * Used by {@link useAnimatedChartData} to drive the continuous-animation preview
 * (new values every few seconds). Same shape as {@link mcqSampleDistribution},
 * so it feeds straight into {@link mcqToChartData}.
 */
export const mcqRandomDistribution = (
  options: McqOptionLike[],
  max = 10,
): Record<string, number> => {
  const out: Record<string, number> = {};
  options.forEach((option) => {
    out[option.id] = Math.floor(Math.random() * (max + 1));
  });
  return out;
};

export function deriveChartStats(question: { options: McqOption[]; correctOptionIds: string[] }) {
  const chartData = mcqToChartData(
    question.options,
    question.correctOptionIds,
    mcqSampleDistribution(question.options),
  );
  const denominator = chartData.reduce((sum, d) => sum + d.value, 0);
  const max = Math.max(1, ...chartData.map((d) => d.value));
  return { chartData, denominator, max };
}
