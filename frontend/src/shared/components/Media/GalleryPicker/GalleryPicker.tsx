// Modal body that lets a caller pick an image from the user's gallery, or use
// an external URL. Click a thumbnail → onPick(image) fires with the stored
// `AppImage`; "Use URL" picks an ad-hoc external image without saving it, while
// "Add to gallery" persists the URL as a gallery image and then picks it. The
// caller is responsible for closing the modal.
//
// The gallery is the per-user singleton (`GET /api/galleries/mine`); its images
// are the paginated sub-resource (`GET /api/galleries/{id}/images`). Images can
// be added two ways: by reference (paste an external URL) or by uploading a file
// — the upload POSTs multipart to the gallery ingest route, which stores the
// bytes and derives the size-tier variants server-side. Heavier management
// (delete) lives on the Gallery tab of the Account page so this surface stays a
// quick browse-and-pick.
import { useMemo, useState } from "react";
import { Btn } from "@ui/Buttons/Btn";
import { Input } from "@components/Forms/Input/Input/Input";
import { FileUpload } from "@components/Forms/Input/FileUpload/FileUpload";
import { EmptyState } from "@ui/EmptyState/EmptyState";
import {
  useAddImageMutation,
  useGetMyGalleryQuery,
  useListImagesQuery,
  type AppImage,
  type GalleryImageResponse,
} from "@store/AmbiApi";
import { useUploadGalleryImageMutation } from "@store/endpoints/galleryUpload";
import { externalImage, resolveImageUrl } from "@utils/image";
import { extractErrorMessage } from "@utils/utils";
import styles from "./GalleryPicker.module.css";

// Mirror of the backend ingest cap (`ambi.media.max-upload-bytes`, 10 MB) so the
// client rejects oversize files before the round-trip.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPT_IMAGES = "image/png,image/jpeg,image/webp,image/gif";

interface GalleryPickerProps {
  onPick: (image: AppImage) => void;
  onClose: () => void;
  /** Prefills the "paste URL" input — used by callers whose slot already
   *  references an external URL so the author can edit instead of retyping. */
  initialUrl?: string;
}

// One large page is plenty for a browse-and-pick surface; pagination UI can come
// later if a gallery ever outgrows it.
const PAGE = { page: 0, size: 100 };

const GalleryPicker = ({ onPick, onClose, initialUrl }: GalleryPickerProps) => {
  const { data: gallery } = useGetMyGalleryQuery();
  const galleryId = gallery?.id;
  const { data: page, isLoading } = useListImagesQuery(
    { id: galleryId ?? "", pageable: PAGE },
    { skip: !galleryId },
  );
  const [addImage, { isLoading: isAdding }] = useAddImageMutation();
  const [uploadImage, { isLoading: isUploading }] = useUploadGalleryImageMutation();

  const images = useMemo(() => page?.content ?? [], [page]);

  const [search, setSearch] = useState("");
  const [pasteUrl, setPasteUrl] = useState(initialUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  const filteredImages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return images;
    return images.filter((img) => (img.name ?? "").toLowerCase().includes(q));
  }, [images, search]);

  const handleUseUrl = () => {
    const trimmed = pasteUrl.trim();
    if (!trimmed) return;
    onPick(externalImage(trimmed));
  };

  const handleAddToGallery = async () => {
    const trimmed = pasteUrl.trim();
    if (!trimmed || !galleryId) return;
    setError(null);
    try {
      const created = await addImage({
        id: galleryId,
        addImageRequest: { image: externalImage(trimmed) },
      }).unwrap();
      setPasteUrl("");
      onPick(created.image);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Could not add image. Please try again."));
    }
  };

  const handleUpload = async (files: File[]) => {
    const file = files[0];
    if (!file || !galleryId) return;
    setError(null);
    try {
      const created = await uploadImage({ id: galleryId, file }).unwrap();
      onPick(created.image);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Could not upload image. Please try again."));
    }
  };

  const renderTile = (img: GalleryImageResponse) => {
    const name = img.name ?? "Untitled";
    // Picker tiles are small — SM (200px) is the right tier for the thumb.
    const thumb = resolveImageUrl(img.image, "SM", img.id, 200, 200, false);
    return (
      <button
        type='button'
        key={img.id}
        className={styles.tile}
        onClick={() => {
          onPick(img.image);
        }}>
        {thumb ? (
          <img src={thumb} alt={name} className={styles.thumb} />
        ) : (
          <div className={styles.thumb} aria-hidden='true' />
        )}
        <span className={styles.tileName} title={name}>
          {name}
        </span>
      </button>
    );
  };

  return (
    <div className={styles.picker}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <div className={styles.searchInput}>
            <Input
              type='text'
              fullWidth
              ariaLabel='Search gallery by name'
              placeholder='Search by name…'
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
            />
          </div>
        </div>

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
                  handleUseUrl();
                }
              }}
            />
          </div>
          <Btn onClick={handleUseUrl} disabled={!pasteUrl.trim()}>
            Use URL
          </Btn>
          <Btn
            onClick={() => {
              void handleAddToGallery();
            }}
            disabled={!pasteUrl.trim() || !galleryId || isAdding}>
            {isAdding ? "Adding…" : "Add to gallery"}
          </Btn>
        </div>

        <div className={styles.toolbarRow}>
          <FileUpload
            label='Or upload a file'
            accept={ACCEPT_IMAGES}
            multiple={false}
            maxBytes={MAX_UPLOAD_BYTES}
            onChange={(files) => {
              void handleUpload(files);
            }}
            infoMessage={
              isUploading
                ? "Uploading…"
                : "PNG, JPEG, WebP or GIF · max 10 MB"
            }
          />
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {isLoading && <p>Loading…</p>}
      {!isLoading && filteredImages.length === 0 && (
        <EmptyState
          className={styles.empty}
          title='No images yet'
          message={
            images.length === 0
              ? "Paste an image URL above and add it to your gallery."
              : "No images match your search."
          }
        />
      )}
      {!isLoading && filteredImages.length > 0 && (
        <div className={styles.grid}>{filteredImages.map(renderTile)}</div>
      )}

      <div className={styles.formActions}>
        <Btn onClick={onClose}>Close</Btn>
      </div>
    </div>
  );
};

export { GalleryPicker };
