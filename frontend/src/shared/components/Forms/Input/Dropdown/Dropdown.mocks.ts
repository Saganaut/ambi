// Sample option lists for the Dropdown stories.
import type { DropdownOption } from "./useDropdown";

export const REGION_OPTIONS: DropdownOption[] = [
  { value: "shire", label: "The Shire" },
  { value: "rivendell", label: "Rivendell" },
  { value: "rohan", label: "Rohan" },
  { value: "gondor", label: "Gondor" },
  { value: "mordor", label: "Mordor" },
];

export const CATEGORY_OPTIONS: DropdownOption[] = [
  { value: "history", label: "History" },
  { value: "geography", label: "Geography" },
  { value: "science", label: "Science" },
  { value: "literature", label: "Literature" },
  { value: "film", label: "Film & TV" },
  { value: "music", label: "Music" },
  { value: "sports", label: "Sports" },
  { value: "art", label: "Art" },
];
