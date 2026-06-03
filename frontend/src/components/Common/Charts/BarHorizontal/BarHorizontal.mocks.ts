import type { ChartDatum } from "../types";

// MCQ option counts with the correct answer highlighted.
export const OPTION_COUNTS: ChartDatum[] = [
  { label: "Gandalf", value: 31, highlight: true },
  { label: "Saruman", value: 12 },
  { label: "Radagast", value: 7 },
  { label: "Alatar", value: 3 },
];

// Allocation buckets — many bars, no highlight.
export const ALLOCATION_BUCKETS: ChartDatum[] = [
  { label: "Gondor", value: 42 },
  { label: "Rohan", value: 35 },
  { label: "The Shire", value: 28 },
  { label: "Mordor", value: 19 },
  { label: "Isengard", value: 11 },
  { label: "Lothlórien", value: 6 },
];
