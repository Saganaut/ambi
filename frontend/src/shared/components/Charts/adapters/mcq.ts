import type { McqOption } from "@/shared/types/Elements.types";
import { resolveImageUrl } from "@utils/image";
import type { ChartDatum } from "../Chart.types";

export const mcqToChartData = (
  options: McqOption[],
  correctOptionIds: string[],
  distribution: Record<string, number>,
): ChartDatum[] => {
  const correct = new Set(correctOptionIds);
  return options.map((option) => ({
    id: option.id,
    text: option.text,
    color: option.color,
    imageUrl: resolveImageUrl(option.image, "SM", option.id, 200, 200, false) ?? undefined,
    imageAlt: option.image?.altText ?? undefined,
    value: distribution[option.id] ?? 0,
    highlight: correct.has(option.id),
    isCorrect: correct.has(option.id),
    optionType: option.optionType,
  }));
};

export const mcqSampleDistribution = (options: McqOption[]): Record<string, number> => {
  const out: Record<string, number> = {};

  for (const option of options) {
    let hash = 0;
    for (let i = 0; i < option.id.length; i++) {
      hash = (hash << 5) - hash + option.id.charCodeAt(i);
      hash |= 0;
    }
    const weight = (Math.abs(hash) % 12) + 1;
    out[option.id] = weight;
  }

  return out;
};
/**
 * A random preview distribution — each option gets a fresh integer in [0, max].
 * Used by {@link useAnimatedChartData} to drive the continuous-animation preview
 * (new values every few seconds). Same shape as {@link mcqSampleDistribution},
 * so it feeds straight into {@link mcqToChartData}.
 */
export const mcqRandomDistribution = (options: McqOption[], max = 10): Record<string, number> => {
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
