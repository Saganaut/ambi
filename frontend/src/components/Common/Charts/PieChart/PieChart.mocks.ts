import type { ChartDatum } from "../types";

// Share-of-total distribution with a clear leader.
export const VOTE_SHARES: ChartDatum[] = [
  { label: "Aragorn", value: 30 },
  { label: "Boromir", value: 18 },
  { label: "Legolas", value: 14 },
  { label: "Gimli", value: 8 },
];

// Five slices to exercise the full tone palette.
export const FIVE_SLICES: ChartDatum[] = [
  { label: "Fire", value: 12 },
  { label: "Water", value: 10 },
  { label: "Earth", value: 9 },
  { label: "Air", value: 7 },
  { label: "Aether", value: 5 },
];

// All-zero data exercises the empty state.
export const EMPTY_DATA: ChartDatum[] = [
  { label: "Yes", value: 0 },
  { label: "No", value: 0 },
];
