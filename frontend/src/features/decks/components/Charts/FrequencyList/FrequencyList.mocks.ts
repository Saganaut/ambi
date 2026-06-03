import type { FrequencyListItem } from "./FrequencyList";

// Free-text Q&A submissions, one marked correct.
export const QA_SUBMISSIONS: FrequencyListItem[] = [
  { text: "Mount Doom", count: 18, correct: true },
  { text: "Orodruin", count: 6, correct: true },
  { text: "The volcano", count: 4 },
  { text: "Mordor", count: 3 },
  { text: "I don't know", count: 1 },
];

// Open-ended responses with no correct answer.
export const OPEN_RESPONSES: FrequencyListItem[] = [
  { text: "Second breakfast", count: 11 },
  { text: "Elevenses", count: 7 },
  { text: "Pipe-weed", count: 5 },
  { text: "A good book", count: 2 },
];

export const EMPTY_SUBMISSIONS: FrequencyListItem[] = [];
