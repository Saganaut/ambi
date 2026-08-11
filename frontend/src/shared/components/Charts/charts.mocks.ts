import type { ChartDatum, ChartType } from "./Chart.types";

// Shared fixtures for the chart stories. A small MCQ-style distribution with one
// correct (highlighted) option and a couple of explicit option colours, plus the
// full list of dispatcher chart kinds.
export const SAMPLE_DATA: ChartDatum[] = [
  { id: "1", optionType: "TEXT", text: "Frodo", value: 19, highlight: true, color: "#6019ff" },
  { id: "2", optionType: "TEXT", text: "Sam", value: 11, color: "#ff6e0b" },
  { id: "3", optionType: "TEXT", text: "Gollum", value: 6 },
  { id: "4", optionType: "TEXT", text: "Boromir", value: 3 },
];

export const ALL_CHART_TYPES: ChartType[] = [
  "BAR_HORIZONTAL",
  "BAR_VERTICAL",
  "PIE",
  "DONUT",
  "LINE",
  "PARETO",
  "DOT",
  "POOL_RIBBON",
  "HISTOGRAM",
  "WORD_CLOUD",
  "HEATMAP",
  "DIVERGING_BAR",
  "IMAGE_OVERLAY",
  "NONE",
];

// A binned distribution for the Histogram: each datum is a bin (`text` = bin
// label, `value` = count), roughly bell-shaped with the modal bin highlighted.
export const HISTOGRAM_SAMPLE: ChartDatum[] = [
  { id: "b1", optionType: "NUMBER", text: "0–20", value: 2 },
  { id: "b2", optionType: "NUMBER", text: "20–40", value: 6 },
  { id: "b3", optionType: "NUMBER", text: "40–60", value: 13, highlight: true },
  { id: "b4", optionType: "NUMBER", text: "60–80", value: 8 },
  { id: "b5", optionType: "NUMBER", text: "80–100", value: 3 },
];
