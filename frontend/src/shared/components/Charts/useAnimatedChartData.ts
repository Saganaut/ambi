// Drives the chart data the result charts render. Normally this is the
// deterministic sample distribution (`deriveChartStats`); when
// `continuousAnimation` is on it instead swaps every option's value for a fresh
// random one on a 5-second timer, so an author can preview how a chart moves as
// live results stream in. Centralised here (and called once in
// `ResultsDisplaySwitch`) so the charts stay purely presentational — they just
// re-render off the `data`/`denominator`/`max` triple this returns.
import { McqQuestionView } from "@/features/deck/hooks/useMcqEditor";
import { mcqSampleDistribution } from "./adapters/mcq";

const RANDOM_INTERVAL_MS = 3000;
const RANDOM_VALUE_MAX = 10;

interface UseAnimatedChartDataResult {
  distribution: Record<string, number>;
  highestValue: number;
  denominator: number;
  optionCount: number;
  columns: number;
}

export function useAnimatedChartData(
  question?: McqQuestionView,
): UseAnimatedChartDataResult | null {
  // const [distribution, setDistribution] = useState<Record<string, number> | null>(null);

  // // Keep the latest options without re-arming the interval on every editor edit
  // // (same callback-ref trick as useDebouncedCommit).
  // const optionsRef = useRef(question?.options ?? []);
  // optionsRef.current = question?.options ?? [];

  // useEffect(() => {
  //   if (!continuousAnimation) {
  //     setDistribution(null);
  //     return;
  //   }
  //   const id = setInterval(() => {
  //     setDistribution(mcqRandomDistribution(optionsRef.current, RANDOM_VALUE_MAX));
  //   }, RANDOM_INTERVAL_MS);
  //   return () => {
  //     clearInterval(id);
  //   };
  // }, [continuousAnimation]);

  // if (question == null) return { data: [] };

  // // Off, or before the first tick fires: deterministic sample, no behaviour
  // // change and no flash of empty data.
  // if (!continuousAnimation || distribution == null) {
  //   const { chartData } = deriveChartStats(question);
  //   return { data: chartData };
  // }

  // const data = mcqToChartData(question.options, question.correctOptionIds, distribution);

  if (question == null) return null;

  const distribution = mcqSampleDistribution(question.options);
  const distributionValuesArray = Object.values(distribution);
  const highestValue = Math.max(...Object.values(distributionValuesArray));
  const denominator = distributionValuesArray.reduce((sum, value) => sum + value, 0);
  const optionCount = question.options.length;
  const columns = optionCount ? Math.max(Math.ceil(optionCount / 2), 2) : 2;

  return { distribution, highestValue, denominator, optionCount, columns };
}
