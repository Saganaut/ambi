// Modal body for choosing an image, with two tabs:
//   • Gallery — pick one of the user's stored images (GalleryTab).
//   • Upload  — bring in a new one by file or web URL, crop it, name it, and add
//               alt text before it's stored (UploadTab + ImageCropEditor).
// Either way the chosen image is handed to the caller via onPick(AppImage); the
// caller closes the modal. Every image the picker yields is now a stored,
// S3-backed AppImage — pasted URLs are fetched + stored too, not kept as bare
// external references.
//
// The gallery is the per-user singleton (`GET /api/galleries/mine`); its images
// are the paginated sub-resource (`GET /api/galleries/{id}/images`). Callers that
// target a fixed-shape slot (deck/slide background, avatar, …) pass cropWidth +
// cropHeight to constrain the Upload tab's crop box; it defaults to 16:9. A
// caller whose slot takes the image's own shape (Place-on-Image's backing
// image) passes cropAspect="source" instead, so uploads keep their aspect
// ratio rather than being clipped to a frame.
import { useState } from "react";
import { Btn } from "@ui/Buttons/Btn";
import { ErrorFallback } from "@ui/BoundaryFallbacks/ErrorFallback";
import { ErrorBoundary } from "@ui/ErrorBoundary/ErrorBoundary";
import { Tabs, type TabsItem } from "@ui/Tabs/Tabs";
import {
  useGetMyGalleryQuery,
  type AppImage,
} from "@features/gallery/store/galleryApi.gen";
import { GalleryTab } from "./GalleryTab";
import { UploadTab } from "./UploadTab";
import styles from "./GalleryPicker.module.css";

// Used when a caller doesn't constrain the crop to a specific slot shape.
const DEFAULT_CROP_ASPECT = 16 / 9;

interface GalleryPickerProps {
  onPick: (image: AppImage) => void;
  onClose: () => void;
  /** Prefills the Upload tab's "paste URL" field (and opens that tab first). */
  initialUrl?: string;
  /** Target slot dimensions; together they set the crop box aspect ratio. */
  cropWidth?: number;
  cropHeight?: number;
  /** "source": the crop box takes each uploaded image's own aspect ratio
   *  (wins over cropWidth/cropHeight). */
  cropAspect?: "source";
}

type PickerTab = "gallery" | "upload";

const GalleryPicker = ({
  onPick,
  onClose,
  initialUrl,
  cropWidth,
  cropHeight,
  cropAspect,
}: GalleryPickerProps) => {
  const { data: gallery, isError: galleryError } = useGetMyGalleryQuery();
  const galleryId = gallery?.id;
  const aspect: number | "source" =
    cropAspect ??
    (cropWidth && cropHeight ? cropWidth / cropHeight : DEFAULT_CROP_ASPECT);
  const [tab, setTab] = useState<PickerTab>(initialUrl ? "upload" : "gallery");

  const items: TabsItem[] = [
    {
      id: "gallery",
      label: "Gallery",
      panel: (
        <GalleryTab
          galleryId={galleryId}
          galleryError={galleryError}
          onPick={onPick}
        />
      ),
    },
    {
      id: "upload",
      label: "Upload",
      panel: (
        <UploadTab
          galleryId={galleryId}
          aspect={aspect}
          initialUrl={initialUrl}
          onPicked={onPick}
        />
      ),
    },
  ];

  return (
    <div className={styles.picker}>
      <ErrorBoundary
        boundaryName="gallery-picker"
        fallback={<ErrorFallback message="Something went wrong loading the image picker." />}
      >
        <Tabs
          className={styles.pickerTabs}
          items={items}
          value={tab}
          onChange={(id) => {
            setTab(id as PickerTab);
          }}
          ariaLabel='Image source'
        />
      </ErrorBoundary>
      <div className={styles.formActions}>
        <Btn onClick={onClose}>Close</Btn>
      </div>
    </div>
  );
};

export { GalleryPicker };
