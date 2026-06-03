// Sample datasets used by ChartPreview to render the hover-preview demo of
// each ChartType. Numbers are tuned so:
//   - bar/pie samples show one clear leader plus three falling-off options
//     (matches the "MCQ with a correct answer" shape the picker will most
//     often visualise — first bar is the highlight),
//   - the word-cloud sample carries enough range that the largest word
//     reads ~3x the smallest after the scale clamp in WordCloud.tsx.
import type { ChartDatum } from "../types";

export const SAMPLE_OPTION_COUNTS: ChartDatum[] = [
  { label: "Option A", value: 24, highlight: true },
  { label: "Option B", value: 16 },
  { label: "Option C", value: 9 },
  { label: "Option D", value: 5 },
];

export const SAMPLE_WORDS: ChartDatum[] = [
  { label: "Awesome", value: 18 },
  { label: "Fun", value: 14 },
  { label: "Cool", value: 11 },
  { label: "Great", value: 9 },
  { label: "Neat", value: 7 },
  { label: "Wild", value: 6 },
  { label: "Bold", value: 5 },
  { label: "Sharp", value: 4 },
  { label: "Bright", value: 3 },
  { label: "Quick", value: 2 },
];
