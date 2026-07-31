// Upload tab: bring in a new image by file or by pasting a web URL, frame it in
// the crop editor, and save it. Both paths converge on the same flow — a source
// blob URL → crop → multipart upload — so a pasted URL is stored as owned bytes
// (via the SSRF-guarded backend proxy) rather than kept as a fragile external
// reference. On success the freshly stored AppImage is handed back via onPicked
// (and the cache-fold enhancement adds it to the Gallery tab).
//
// This tab owns only the *sourcing* half; everything from the crop box onwards
// lives in CropAndSaveStep, which the Gallery tab's crop-on-pick path shares.
import { useEffect, useState } from "react";
import { Btn } from "@ui/Buttons/Btn";
import { Input } from "@components/Forms/Input/Input/Input";
import { FileUpload } from "@components/Forms/Input/FileUpload/FileUpload";
import type { AppImage } from "@features/gallery/store/galleryApi.gen";
import { fetchRemoteImage } from "@utils/imageEditing";
import { extractErrorMessage } from "@utils/utils";
import { CropAndSaveStep } from "./CropAndSaveStep";
import styles from "./GalleryPicker.module.css";

// Mirror of the backend ingest cap (`ambi.media.max-upload-bytes`, 10 MB) so the
// client rejects oversize files before the round-trip.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPT_IMAGES = "image/png,image/jpeg,image/webp,image/gif,image/avif";

interface UploadSource {
  /** Blob/object URL the crop editor renders. */
  objectUrl: string;
  /** Suggested name (filename, or the URL's last path segment). */
  name: string;
}

interface UploadTabProps {
  galleryId?: string;
  /** Crop box aspect ratio passed through to the editor ("source" = the image's own). */
  aspect: number | "source";
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

const UploadTab = ({
  galleryId,
  aspect,
  initialUrl,
  onPicked,
}: UploadTabProps) => {
  const [source, setSource] = useState<UploadSource | null>(null);
  const [pasteUrl, setPasteUrl] = useState(initialUrl ?? "");
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Free the blob URL when we leave a source (cancel / new pick) or unmount.
  useEffect(() => {
    if (!source) return;
    return () => {
      URL.revokeObjectURL(source.objectUrl);
    };
  }, [source]);

  const handleFile = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setError(null);
    setSource({ objectUrl: URL.createObjectURL(file), name: file.name });
  };

  const handleLoadUrl = async () => {
    const trimmed = pasteUrl.trim();
    if (!trimmed) return;
    setError(null);
    setIsLoadingUrl(true);
    try {
      const blob = await fetchRemoteImage(trimmed);
      setSource({
        objectUrl: URL.createObjectURL(blob),
        name: fileNameFromUrl(trimmed),
      });
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
        aspect={aspect}
        initialName={source.name}
        galleryId={galleryId}
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
          disabled={!pasteUrl.trim() || isLoadingUrl}>
          {isLoadingUrl ? "Loading…" : "Load"}
        </Btn>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {!galleryId && <p className={styles.uploadHint}>Preparing your gallery…</p>}
    </div>
  );
};

export { UploadTab };
