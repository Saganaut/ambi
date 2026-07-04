// Sample avatar roster for the AvatarSelector stories. Uses inline data-URI
// SVGs so the stories don't depend on bundled image assets being resolvable.
import type { AvatarOption } from "./avatarOptions";

const chip = (bg: string, label: string): (() => Promise<string>) => {
  const url = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${bg}"/><text x="32" y="40" font-size="24" text-anchor="middle" fill="white" font-family="sans-serif">${label}</text></svg>`,
  )}`;
  return () => Promise.resolve(url);
};

export const SAMPLE_AVATARS: AvatarOption[] = [
  { value: "ember", label: "Ember", loadSrc: chip("#ff6b35", "E") },
  { value: "aqua", label: "Aqua", loadSrc: chip("#2b7fff", "A") },
  { value: "violet", label: "Violet", loadSrc: chip("#8e51ff", "V") },
  { value: "moss", label: "Moss", loadSrc: chip("#2ecc71", "M") },
  { value: "rose", label: "Rose", loadSrc: chip("#fb64b6", "R") },
  { value: "amber", label: "Amber", loadSrc: chip("#f1c40f", "A") },
];

// A longer roster (> default maxVisible of 6) to exercise the expand toggle.
export const MANY_AVATARS: AvatarOption[] = [
  ...SAMPLE_AVATARS,
  { value: "slate", label: "Slate", loadSrc: chip("#475569", "S") },
  { value: "teal", label: "Teal", loadSrc: chip("#00bc7d", "T") },
  { value: "crimson", label: "Crimson", loadSrc: chip("#ff2056", "C") },
  { value: "indigo", label: "Indigo", loadSrc: chip("#4f46e5", "I") },
  { value: "lime", label: "Lime", loadSrc: chip("#9ae600", "L") },
  { value: "cyan", label: "Cyan", loadSrc: chip("#00b8db", "C") },
];
