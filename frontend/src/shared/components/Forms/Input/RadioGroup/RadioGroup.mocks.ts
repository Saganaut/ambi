// Sample option lists for the RadioGroup stories.

export interface RadioGroupOption {
  value: string;
  label: string;
}

export const difficultyOptions: RadioGroupOption[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export const visibilityOptions: RadioGroupOption[] = [
  { value: "private", label: "Private" },
  { value: "unlisted", label: "Unlisted" },
  { value: "public", label: "Public" },
];
