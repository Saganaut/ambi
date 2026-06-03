import type { DistributionRow } from "./DistributionList";

export const mockCountRows: DistributionRow[] = [
  { key: "opt-1", label: "Frodo Baggins", value: 127, display: "127" },
  { key: "opt-2", label: "Samwise Gamgee", value: 84, display: "84", highlight: true },
  { key: "opt-3", label: "Aragorn", value: 41, display: "41" },
  { key: "opt-4", label: "Gandalf", value: 18, display: "18" },
  { key: "opt-5", label: "Legolas", value: 6, display: "6" },
];

export const mockAverageRows: DistributionRow[] = [
  { key: "q-1", label: "Difficulty", value: 1.5, display: "1.5" },
  { key: "q-2", label: "Pacing", value: 3.2, display: "3.2" },
  { key: "q-3", label: "Clarity", value: 4.8, display: "4.8", highlight: true },
];
