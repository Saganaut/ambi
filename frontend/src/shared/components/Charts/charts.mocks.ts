import type { ChartDatum, ChartType } from "./types";

// Shared fixtures for the chart stories. A small MCQ-style distribution with one
// correct (highlighted) option and a couple of explicit option colours, plus the
// full list of dispatcher chart kinds.
export const SAMPLE_DATA: ChartDatum[] = [
  { label: "Frodo", value: 19, highlight: true, color: "#6019ff" },
  { label: "Sam", value: 11, color: "#ff6e0b" },
  { label: "Gollum", value: 6 },
  { label: "Boromir", value: 3 },
];

export const ALL_CHART_TYPES: ChartType[] = [
  "BAR_HORIZONTAL",
  "BAR_VERTICAL",
  "PIE",
  "DONUT",
  "LINE",
  "PARETO",
  "DOT",
  "NONE",
];
