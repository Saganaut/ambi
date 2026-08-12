// Upload tab: bring in a new image by file or by pasting a web URL, optionally
// frame it in the crop editor, and save it. Both paths converge on the same
// flow — a source blob URL → (crop) → multipart upload — so a pasted URL is
// stored as owned bytes (via the SSRF-guarded backend proxy) rather than kept as
// a fragile external reference.
//
// A genuinely new image always enriches the gallery, and always as the
// *original*: the uncropped file is what lands in the library, whether the
// author skips the crop or not. When the picker carries a deck the crop itself
// is placement data and goes to that deck's own namespace instead, so one
// upload leaves exactly one gallery entry. With no deck target there is nothing
// to scope a crop to, so the cropped bytes are the gallery entry (as before) and
// the original is only stored when the author keeps it — either way, one entry.
//
// This tab owns only the *sourcing* half and the gallery write; everything from
// the crop box onwards lives in CropAndSaveStep, which the Gallery tab's
// crop-on-pick path shares.
import { useEffect, useRef, useState } from "react";
import { Btn } from "@saganaut/ambi-ui";
import { Input } from "@components/Forms/Input/Input/Input";
import { FileUpload } from "@components/Forms/Input/FileUpload/FileUpload";
import {
  useUploadImageMutation,
  type AppImage,
  type GalleryImageResponse,
} from "@features/gallery/store/galleryApi.gen";
import { useAsyncAction } from "@hooks/useAsyncAction";
import { fetchRemoteImage } from "@utils/imageEditing";
import { extractErrorMessage } from "@utils/utils";
import { CropAndSaveStep } from "./CropAndSaveStep";
import type { ResolvedCropConfig } from "./cropConfig";
import styles from "./GalleryPicker.module.css";

// Mirror of the backend ingest cap (`ambi.media.max-upload-bytes`, 10 MB) so the
// client rejects oversize files before the round-trip.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPT_IMAGES = "image/png,image/jpeg,image/webp,image/gif,image/avif";

interface UploadSource {
  /** Blob/object URL the crop editor renders. */
  objectUrl: string;
  /** The original bytes, as uploaded to the gallery. */
  file: File;
  /** Suggested name (filename, or the URL's last path segment). */
  name: string;
}

interface UploadTabProps {
  galleryId?: string;
  /** Deck that owns crops made here; without it a crop lands in the gallery. */
  deckId?: string;
  /** Whether (and at what shape) the upload is cropped. */
  crop: ResolvedCropConfig;
  /** Prefill for the paste-URL field. */
  initialUrl?: string;
  onPicked: (image: AppImage) => void;
}

/** Best-effort filename from a URL's last path segment. */
const fileNameFromUrl = (url: string): string => {
  try {
    const { pathname } = new URL(url);
    const last = pathname.substring(pathname.lastIndexOf("/") + 1);
    return decodeURIComponent(last) || "image";
  } catch {
    return "image";
  }
};

/** Proxied bytes arrive nameless; give them one the ingest can read a type off. */
const fileFromBlob = (blob: Blob, name: string): File => {
  const extension = blob.type.split("/")[1] ?? "img";
  const filename = name.includes(".") ? name : `${name}.${extension}`;
  return new File([blob], filename, { type: blob.type });
};

const UploadTab = ({
  galleryId,
  deckId,
  crop,
  initialUrl,
  onPicked,
}: UploadTabProps) => {
  const [source, setSource] = useState<UploadSource | null>(null);
  const [pasteUrl, setPasteUrl] = useState(initialUrl ?? "");
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadImage] = useUploadImageMutation();

  // The gallery row for the current source, once stored. Cached so an author who
  // takes the original and then reconsiders and crops doesn't store it twice.
  const storedOriginal = useRef<GalleryImageResponse | null>(null);

  // Free the blob URL when we leave a source (cancel / new pick) or unmount.
  useEffect(() => {
    if (!source) return;
    return () => {
      URL.revokeObjectURL(source.objectUrl);
      storedOriginal.current = null;
    };
  }, [source]);

  const storeOriginal = async (
    file: File,
    name: string,
    altText: string,
  ): Promise<GalleryImageResponse> => {
    const cached = storedOriginal.current;
    if (cached) return cached;
    if (!galleryId) throw new Error("Your gallery isn’t ready yet.");
    const created = await uploadImage({
      id: galleryId,
      name: name || undefined,
      altText: altText || undefined,
      body: { file },
    }).unwrap();
    storedOriginal.current = created;
    return created;
  };

  // With cropping off there is no editor to pass through: the original is the
  // pick, so store it and hand it straight back.
  const [storeAndPick, { isRunning: isStoring, error: storeError }] =
    useAsyncAction(async (file: File, name: string) => {
      const created = await storeOriginal(file, name, "");
      onPicked(created.image);
    });

  const beginSource = (file: File, name: string) => {
    setError(null);
    if (crop.mode === "off") {
      void storeAndPick(file, name);
      return;
    }
    storedOriginal.current = null;
    setSource({ objectUrl: URL.createObjectURL(file), file, name });
  };

  const handleFile = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    beginSource(file, file.name);
  };

  const handleLoadUrl = async () => {
    const trimmed = pasteUrl.trim();
    if (!trimmed) return;
    setError(null);
    setIsLoadingUrl(true);
    try {
      const blob = await fetchRemoteImage(trimmed);
      const name = fileNameFromUrl(trimmed);
      beginSource(fileFromBlob(blob, name), name);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Could not load that image URL."));
    } finally {
      setIsLoadingUrl(false);
    }
  };

  if (source) {
    return (
      <CropAndSaveStep
        objectUrl={source.objectUrl}
        aspect={crop.aspect}
        initialName={source.name}
        galleryId={galleryId}
        deckId={deckId}
        // The gallery gets the original first, so the crop's provenance can name
        // a real id — and only when the crop itself lands somewhere else.
        prepareSource={
          deckId
            ? async ({ name, altText }) => {
                const created = await storeOriginal(source.file, name, altText);
                return { galleryId: created.galleryId, imageId: created.id };
              }
            : undefined
        }
        resolveOriginal={
          crop.mode === "optional"
            ? async ({ name, altText }) =>
                (await storeOriginal(source.file, name, altText)).image
            : undefined
        }
        onSaved={(image) => {
          setSource(null);
          onPicked(image);
        }}
        onCancel={() => {
          setSource(null);
        }}
      />
    );
  }

  const storeMessage = storeError
    ? extractErrorMessage(storeError, "Could not store that image.")
    : null;

  return (
    <div className={styles.uploadForm}>
      <FileUpload
        label='Upload a file'
        accept={ACCEPT_IMAGES}
        multiple={false}
        maxBytes={MAX_UPLOAD_BYTES}
        onChange={handleFile}
        infoMessage='PNG, JPEG, WebP or GIF · max 10 MB'
      />

      <p className={styles.uploadHint}>or use an image from the web</p>
      <div className={styles.toolbarRow}>
        <div className={styles.searchInput}>
          <Input
            type='text'
            fullWidth
            ariaLabel='Image URL'
            placeholder='Paste an image URL'
            value={pasteUrl}
            onChange={(e) => {
              setPasteUrl(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleLoadUrl();
              }
            }}
          />
        </div>
        <Btn
          onClick={() => {
            void handleLoadUrl();
          }}
          isDisabled={!pasteUrl.trim() || isLoadingUrl}>
          {isLoadingUrl ? "Loading…" : "Load"}
        </Btn>
      </div>

      {isStoring && <p className={styles.uploadHint}>Storing your image…</p>}
      {error && <p className={styles.error}>{error}</p>}
      {storeMessage && <p className={styles.error}>{storeMessage}</p>}
      {!galleryId && <p className={styles.uploadHint}>Preparing your gallery…</p>}
    </div>
  );
};

export { UploadTab };
