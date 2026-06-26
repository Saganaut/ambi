// Drives the chart data the result charts render. Normally this is the
// deterministic sample distribution (`deriveChartStats`); when
// `continuousAnimation` is on it instead swaps every option's value for a fresh
// random one on a 5-second timer, so an author can preview how a chart moves as
// live results stream in. Centralised here (and called once in
// `ResultsDisplaySwitch`) so the charts stay purely presentational — they just
// re-render off the `data`/`denominator`/`max` triple this returns.
import type { McqOption } from "@/shared/types/elements";
import { useEffect, useRef, useState } from "react";
import { deriveChartStats, mcqRandomDistribution, mcqToChartData } from "./adapters/mcq";
import type { ChartDatum } from "./types";

const RANDOM_INTERVAL_MS = 3000;
const RANDOM_VALUE_MAX = 10;

interface ChartQuestion {
  options: McqOption[];
  correctOptionIds: string[];
}

export function useAnimatedChartData(
  question: ChartQuestion | undefined,
  continuousAnimation: boolean,
): { data: ChartDatum[] } {
  const [distribution, setDistribution] = useState<Record<string, number> | null>(null);

  // Keep the latest options without re-arming the interval on every editor edit
  // (same callback-ref trick as useDebouncedCommit).
  const optionsRef = useRef(question?.options ?? []);
  optionsRef.current = question?.options ?? [];

  useEffect(() => {
    if (!continuousAnimation) {
      setDistribution(null);
      return;
    }
    const id = setInterval(() => {
      setDistribution(mcqRandomDistribution(optionsRef.current, RANDOM_VALUE_MAX));
    }, RANDOM_INTERVAL_MS);
    return () => {
      clearInterval(id);
    };
  }, [continuousAnimation]);

  if (question == null) return { data: [] };

  // Off, or before the first tick fires: deterministic sample, no behaviour
  // change and no flash of empty data.
  if (!continuousAnimation || distribution == null) {
    const { chartData } = deriveChartStats(question);
    return { data: chartData };
  }

  const data = mcqToChartData(question.options, question.correctOptionIds, distribution);
  return { data };
}
