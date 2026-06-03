import type { BarChartItem } from "./BarChart";

// MCQ option counts — one clearly correct answer (highlighted) plus three
// distractors falling off, mirroring the most common live-results shape.
export const MCQ_OPTION_COUNTS: BarChartItem[] = [
  { label: "Frodo Baggins", value: 28, highlight: true },
  { label: "Samwise Gamgee", value: 14 },
  { label: "Bilbo Baggins", value: 9 },
  { label: "Peregrin Took", value: 4 },
];

// Round-by-round score deltas — no single highlight, wider spread.
export const ROUND_SCORES: BarChartItem[] = [
  { label: "Round 1", value: 120 },
  { label: "Round 2", value: 85 },
  { label: "Round 3", value: 200 },
  { label: "Round 4", value: 60 },
  { label: "Round 5", value: 145 },
];

// A near-even split, useful for checking percentage rounding.
export const EVEN_SPLIT: BarChartItem[] = [
  { label: "Yes", value: 17 },
  { label: "No", value: 16 },
];
