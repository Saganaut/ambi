// Modal body for choosing an avatar, with three tabs:
//   • Built-in — pick from the frontend-bundled roster (AvatarSelector).
//   • Gallery  — pick one of the user's stored images (GalleryTab).
//   • Upload   — bring in a new image by file or web URL with a square crop
//                (UploadTab); it lands in the user's gallery like any upload.
// The two image tabs reuse the GalleryPicker's tabs, so the avatar surface
// stays in lockstep with the deck-editor image pickers.
//
// Picks are handed to the caller as a discriminated union — a built-in pick is
// an id the backend stores as `internalAvatarId`, an image pick is a complete
// gallery-backed AppImage — and the caller owns the write (PATCH /users/me for
// the account page; a future lobby picker would target its own endpoint) and
// closes the modal.
import { useState } from "react";
import { Btn } from "@ui/Buttons/Btn";
import { Tabs, type TabsItem } from "@ui/Tabs/Tabs";
import { AvatarSelector } from "@components/Forms/Input/AvatarSelector/AvatarSelector";
import {
  AVATAR_COLLECTIONS,
  collectionIdForValue,
} from "@components/Forms/Input/AvatarSelector/avatarOptions";
import { Dropdown } from "@components/Forms/Input/Dropdown/Dropdown";
import {
  useGetMyGalleryQuery,
  type AppImage,
} from "@features/gallery/store/galleryApi.gen";
import { GalleryTab } from "../GalleryPicker/GalleryTab";
import { UploadTab } from "../GalleryPicker/UploadTab";
import styles from "./AvatarPicker.module.css";

type AvatarPick =
  | { kind: "builtin"; internalAvatarId: string }
  | { kind: "image"; image: AppImage };

interface AvatarPickerProps {
  /** Currently selected built-in id; preselects that tile on the Built-in tab. */
  builtinValue?: string;
  onPick: (pick: AvatarPick) => void;
  onClose: () => void;
}

type PickerTab = "builtin" | "gallery" | "upload";

const collectionOptions = AVATAR_COLLECTIONS.map((c) => ({
  value: c.id,
  label: c.label,
}));

const AvatarPicker = ({ builtinValue, onPick, onClose }: AvatarPickerProps) => {
  const { data: gallery, isError: galleryError } = useGetMyGalleryQuery();
  const galleryId = gallery?.id;
  const [tab, setTab] = useState<PickerTab>("builtin");
  // Show one collection at a time so only that collection's images load. Open
  // on the collection holding the current selection, else the first collection.
  const [collectionId, setCollectionId] = useState(
    () => collectionIdForValue(builtinValue) ?? AVATAR_COLLECTIONS[0].id,
  );
  const activeOptions =
    AVATAR_COLLECTIONS.find((c) => c.id === collectionId)?.options ??
    AVATAR_COLLECTIONS[0].options;

  const items: TabsItem[] = [
    {
      id: "builtin",
      label: "Built-in",
      panel: (
        <div className={styles.tabPanel}>
          <Dropdown
            label='Collection'
            options={collectionOptions}
            value={[collectionId]}
            onChange={(values) => {
              if (values[0]) setCollectionId(values[0]);
            }}
          />
          <AvatarSelector
            legend='Pick a built-in avatar'
            options={activeOptions}
            value={builtinValue ?? ""}
            onChange={(value) => {
              onPick({ kind: "builtin", internalAvatarId: value });
            }}
          />
        </div>
      ),
    },
    {
      id: "gallery",
      label: "Gallery",
      panel: (
        <GalleryTab
          galleryId={galleryId}
          galleryError={galleryError}
          onPick={(image) => {
            onPick({ kind: "image", image });
          }}
        />
      ),
    },
    {
      id: "upload",
      label: "Upload",
      panel: (
        <UploadTab
          galleryId={galleryId}
          aspect={1}
          onPicked={(image) => {
            onPick({ kind: "image", image });
          }}
        />
      ),
    },
  ];

  return (
    <div className={styles.picker}>
      <Tabs
        className={styles.pickerTabs}
        items={items}
        value={tab}
        onChange={(id) => {
          setTab(id as PickerTab);
        }}
        ariaLabel='Avatar source'
      />
      <div className={styles.formActions}>
        <Btn onClick={onClose}>Close</Btn>
      </div>
    </div>
  );
};

export { AvatarPicker };
export type { AvatarPick, AvatarPickerProps };
