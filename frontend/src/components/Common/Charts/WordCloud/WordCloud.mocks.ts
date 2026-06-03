import type { ChartDatum } from "../types";

// Free-text sentiment aggregation with a wide frequency range so the scale
// clamp produces a visible size spread.
export const SENTIMENT_WORDS: ChartDatum[] = [
  { label: "Epic", value: 24 },
  { label: "Thrilling", value: 19 },
  { label: "Emotional", value: 15 },
  { label: "Long", value: 12 },
  { label: "Beautiful", value: 10 },
  { label: "Intense", value: 8 },
  { label: "Hopeful", value: 6 },
  { label: "Dark", value: 5 },
  { label: "Funny", value: 4 },
  { label: "Confusing", value: 2 },
];

// A short list with one highlighted (correct) word.
export const FAVORITE_PLACES: ChartDatum[] = [
  { label: "The Shire", value: 20, highlight: true },
  { label: "Rivendell", value: 13 },
  { label: "Minas Tirith", value: 9 },
  { label: "Moria", value: 4 },
];
