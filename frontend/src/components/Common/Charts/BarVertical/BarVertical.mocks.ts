import type { ChartDatum } from "../types";

// NumberQuestion bin distribution — a roughly normal spread across bins.
export const NUMBER_BINS: ChartDatum[] = [
  { label: "0–10", value: 4 },
  { label: "11–20", value: 12 },
  { label: "21–30", value: 23, highlight: true },
  { label: "31–40", value: 15 },
  { label: "41–50", value: 6 },
];

// ScalesQuestion responses per statement (Likert-style 1–5).
export const SCALE_RESPONSES: ChartDatum[] = [
  { label: "Strongly disagree", value: 3 },
  { label: "Disagree", value: 8 },
  { label: "Neutral", value: 14 },
  { label: "Agree", value: 22 },
  { label: "Strongly agree", value: 11 },
];
