// avatarOptions — the build-time catalog of bundled built-in avatars.
//
// Built-in avatars ship as static assets under /assets/images/mascots/ and are
// persisted against a user only as a *stable* id string (`internalAvatarId`),
// never a Vite-hashed URL, so a rebuild never orphans a saved avatar. This
// module is the single source of truth for that roster:
//
//   • Every option is derived from import.meta.glob at build time, so adding or
//     removing an avatar is a filesystem operation — drop a `${prefix}_NN.png`
//     into the right folder and it appears. (glob patterns must be string
//     literals for Vite to analyse them, hence one glob per folder.)
//   • Avatars are grouped into named collections. The picker shows exactly one
//     collection at a time, so only that collection's images are ever fetched —
//     the app never pulls the whole ~170-image roster to render the picker.
//
// Two shapes are exported:
//   • AVATAR_COLLECTIONS — ordered {id,label,options}; drives the picker.
//   • AVATAR_OPTIONS — every option flattened, for id→asset resolution in
//     avatarUrl.ts (resolution is by id and must see every avatar regardless of
//     which collection it lives in).
import playerAvatar1 from "@assets/images/mascots/player-avatar-1.svg";
import playerAvatar2 from "@assets/images/mascots/player-avatar-2.svg";
import playerAvatar3 from "@assets/images/mascots/player-avatar-3.svg";

interface AvatarOption {
  value: string;
  label: string;
  src: string;
}

interface AvatarCollection {
  id: string;
  label: string;
  options: AvatarOption[];
}

// Every roster file is named `${prefix}_NN.png`; the trailing number is all we
// need to derive a stable id, so one regex covers every collection.
const NUM_RE = /_(\d+)\.png$/;

// Turns a glob of `${prefix}_NN.png` modules (each default export is the asset
// URL) into sorted options with stable, zero-padded ids (`${idPrefix}-NN`).
const buildOptions = (
  modules: Record<string, string>,
  idPrefix: string,
  labelPrefix: string,
): AvatarOption[] =>
  Object.entries(modules)
    .map(([path, src]) => ({ num: Number(NUM_RE.exec(path)?.[1] ?? 0), src }))
    .sort((a, b) => a.num - b.num)
    .map(({ num, src }) => ({
      value: `${idPrefix}-${num.toString().padStart(2, "0")}`,
      label: `${labelPrefix} ${num.toString()}`,
      src,
    }));

// One eager glob per folder — Vite resolves each module's default export to the
// bundled asset URL at build time. Patterns are relative to this module (the
// assets live at src/shared/assets/images/mascots/); Vite does not apply the
// @assets alias inside glob patterns, so the relative path is deliberate.
const classicPng = import.meta.glob<string>(
  "../../../../assets/images/mascots/avatar_*.png",
  { eager: true, import: "default" },
);
const dinosaurPng = import.meta.glob<string>(
  "../../../../assets/images/mascots/dinosaurs/dinosaur_*.png",
  { eager: true, import: "default" },
);
const latamPng = import.meta.glob<string>(
  "../../../../assets/images/mascots/latam/latam_*.png",
  { eager: true, import: "default" },
);
const africanPng = import.meta.glob<string>(
  "../../../../assets/images/mascots/african-animals/african_*.png",
  { eager: true, import: "default" },
);
const mythicalPng = import.meta.glob<string>(
  "../../../../assets/images/mascots/mythical-creatures/mythical_*.png",
  { eager: true, import: "default" },
);
const petPng = import.meta.glob<string>(
  "../../../../assets/images/mascots/pets/pet_*.png",
  { eager: true, import: "default" },
);

// The Classic collection keeps the three original named SVGs plus the numbered
// PNG roster. These ids (`avatar-1..3`, `avatar-04..39`) are persisted verbatim
// as `internalAvatarId`, so they must stay stable — `avatar-1..3` predate this
// change and may already be saved against users; keep the whole set fixed.
const classicOptions: AvatarOption[] = [
  { value: "avatar-1", label: "Ember", src: playerAvatar1 },
  { value: "avatar-2", label: "Aqua", src: playerAvatar2 },
  { value: "avatar-3", label: "Violet", src: playerAvatar3 },
  ...buildOptions(classicPng, "avatar", "Avatar"),
];

const AVATAR_COLLECTIONS: AvatarCollection[] = [
  { id: "classic", label: "Classic", options: classicOptions },
  {
    id: "dinosaurs",
    label: "Dinosaurs",
    options: buildOptions(dinosaurPng, "dinosaur", "Dinosaur"),
  },
  {
    id: "latam",
    label: "Latin America",
    options: buildOptions(latamPng, "latam", "Latam"),
  },
  {
    id: "african",
    label: "African Animals",
    options: buildOptions(africanPng, "african", "African animal"),
  },
  {
    id: "mythical",
    label: "Mythical Creatures",
    options: buildOptions(mythicalPng, "mythical", "Mythical creature"),
  },
  {
    id: "pets",
    label: "Pets",
    options: buildOptions(petPng, "pet", "Pet"),
  },
];

// Flat roster for id→asset resolution (avatarUrl.ts). Every built-in avatar,
// regardless of collection, must be resolvable by id.
const AVATAR_OPTIONS: AvatarOption[] = AVATAR_COLLECTIONS.flatMap(
  (c) => c.options,
);

// The id of the collection a stored avatar value belongs to, so the picker can
// open on the collection the user last chose from. Undefined for unknown ids.
const collectionIdForValue = (
  value: string | null | undefined,
): string | undefined =>
  value == null
    ? undefined
    : AVATAR_COLLECTIONS.find((c) => c.options.some((o) => o.value === value))
        ?.id;

export { AVATAR_COLLECTIONS, AVATAR_OPTIONS, collectionIdForValue };
export type { AvatarCollection, AvatarOption };
