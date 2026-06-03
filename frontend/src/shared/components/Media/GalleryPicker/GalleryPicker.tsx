// Modal body that lets a slide-editor caller pick an image from the user's
// gallery (their own uploads plus anything shared with their orgs). Includes
// an inline upload form so authors can add a new image without leaving the
// editor. Click a thumbnail → onPick(image) fires with a fully-populated
// internal Image (the caller is responsible for closing the modal).
//
// Heavier management (rename / re-tag / delete) lives on the Gallery tab of
// the Account page so this surface stays a quick browse-and-pick.
import { useEffect, useMemo, useRef, useState } from "react";
import { Btn } from "@common/Buttons/Btn";
import { Input } from "@components/Forms/Input/Input/Input";
import { Dropdown } from "@components/Forms/Input/Dropdown/Dropdown";
import { EmptyState } from "@common/EmptyState/EmptyState";
import { IMAGE_TIERS, validateImageFile } from "@utils/imageValidation";
import { externalImage, internalImage, variantFor } from "@utils/image";
import { extractErrorMessage } from "@utils/utils";
import styles from "./GalleryPicker.module.css";
import { useCurrentUser } from "@/features/auth";

interface GalleryPickerProps {
  onPick: (image: Image) => void;
  onClose: () => void;
  /** Prefills the "paste URL" input — used by callers whose slot already
   *  references an external URL so the author can edit instead of retyping. */
  initialUrl?: string;
}

const ALL_TAGS_KEY = "__all__";

const GalleryPicker = ({ onPick, onClose, initialUrl }: GalleryPickerProps) => {
  const userState = useCurrentUser();
  const ownerId =
    userState.state === "registered" ? (userState.user.id ?? null) : null;
  const { data: orgs = [] } = useCurrentUserOrgs();
  const { data: images = [], isLoading } = useListImagesQuery();
  const [uploadImage, { isLoading: isUploading }] = useUploadImageMutation();

  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string>(ALL_TAGS_KEY);
  const [pasteUrl, setPasteUrl] = useState(initialUrl ?? "");
  const [uploadMode, setUploadMode] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadOrgId, setUploadOrgId] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    images.forEach((img) => {
      (img.tags ?? []).forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [images]);

  const filteredImages = useMemo(() => {
    const q = search.trim().toLowerCase();
    return images.filter((img) => {
      const tags = img.tags ?? [];
      if (activeTag !== ALL_TAGS_KEY && !tags.includes(activeTag)) return false;
      if (q) {
        const haystack = `${img.name ?? ""} ${tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [images, activeTag, search]);

  // Revoke the preview object URL when it's replaced or the picker unmounts —
  // browsers leak the underlying blob until the URL is explicitly revoked.
  useEffect(() => {
    if (!uploadPreviewUrl) return;
    return () => {
      URL.revokeObjectURL(uploadPreviewUrl);
    };
  }, [uploadPreviewUrl]);

  const handleFileSelected = (file: File) => {
    setUploadError(null);
    const err = validateImageFile(file, "gallery");
    if (err) {
      setUploadError(err);
      return;
    }
    setUploadFile(file);
    setUploadPreviewUrl(URL.createObjectURL(file));
    if (!uploadName) setUploadName(file.name.replace(/\.[^.]+$/, ""));
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setUploadError("Choose an image to upload.");
      return;
    }
    // The generated `uploadImage` mutation types `body` as `{ image: Blob }` and
    // sends `name`/`tags`/`organizationId` as URL query params. Spring's
    // @RequestParam picks the multipart part for the `MultipartFile` and the
    // string params from the query string, so a FormData body with just `image`
    // is what the wire actually needs — the cast bridges the codegen shape.
    const formData = new FormData();
    formData.append("image", uploadFile);
    const trimmedName = uploadName.trim();
    const trimmedTags = uploadTags.trim();

    setUploadError(null);
    try {
      const created = await uploadImage({
        name: trimmedName || undefined,
        tags: trimmedTags || undefined,
        organizationId: uploadOrgId || undefined,
        body: formData as unknown as { image: Blob },
      }).unwrap();
      // Reset the form for the next upload, return to browse mode, and pick
      // the newly uploaded image immediately so the author doesn't have to
      // hunt for it in the grid.
      setUploadFile(null);
      setUploadPreviewUrl(null);
      setUploadName("");
      setUploadTags("");
      setUploadOrgId("");
      setUploadMode(false);
      if (created.id) {
        // Storage only needs the gallery id — the read-side hydrator
        // refreshes the variants on every response.
        onPick(internalImage(created.id));
      }
    } catch (err: unknown) {
      setUploadError(
        extractErrorMessage(err, "Upload failed. Please try again."),
      );
    }
  };

  const renderTile = (img: GalleryImageResponse) => {
    const isShared = img.ownerId !== ownerId;
    const name = img.name ?? "Untitled";
    const tags = img.tags ?? [];
    // Picker tiles are small — SM (200px) is the right tier for the thumb.
    const thumb = variantFor(
      { useExternalImg: false, internalImgId: img.id, variants: img.variants },
      "SM",
    );
    return (
      <button
        type='button'
        key={img.id}
        className={styles.tile}
        onClick={() => {
          if (img.id) {
            onPick(internalImage(img.id));
          }
        }}>
        {thumb?.url ? (
          <img src={thumb.url} alt={name} className={styles.thumb} />
        ) : (
          <div className={styles.thumb} aria-hidden='true' />
        )}
        <span className={styles.tileName} title={name}>
          {name}
        </span>
        <span className={styles.tileMeta}>
          {isShared && <span className={styles.tileBadge}>Org</span>}
          {tags.slice(0, 2).map((t) => (
            <span key={t} className={styles.tileBadge}>
              {t}
            </span>
          ))}
        </span>
      </button>
    );
  };

  const handleUseUrl = () => {
    const trimmed = pasteUrl.trim();
    if (!trimmed) return;
    onPick(externalImage(trimmed));
  };

  return (
    <div className={styles.picker}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <div className={styles.searchInput}>
            <Input
              type='text'
              fullWidth
              ariaLabel='Search gallery by name or tag'
              placeholder='Search by name or tag…'
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
            />
          </div>
          <div className={styles.toolbarSpacer} />
          <Btn
            onClick={() => {
              setUploadMode((m) => !m);
            }}>
            {uploadMode ? "Cancel upload" : "Upload new"}
          </Btn>
        </div>

        <div className={styles.toolbarRow}>
          <div className={styles.searchInput}>
            <Input
              type='text'
              fullWidth
              ariaLabel='Image URL'
              placeholder='Or paste an image URL'
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
        </div>

        {allTags.length > 0 && (
          <div className={styles.tagFilters}>
            <span className={styles.tagFilterLabel}>Tags:</span>
            <button
              type='button'
              className={`${styles.tagFilterBtn} ${activeTag === ALL_TAGS_KEY ? styles.tagFilterBtnActive : ""}`}
              onClick={() => {
                setActiveTag(ALL_TAGS_KEY);
              }}>
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type='button'
                className={`${styles.tagFilterBtn} ${activeTag === tag ? styles.tagFilterBtnActive : ""}`}
                onClick={() => {
                  setActiveTag(tag);
                }}>
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {uploadMode && (
        <div className={styles.uploadForm}>
          <div className={styles.uploadFormRow}>
            {uploadPreviewUrl ? (
              <img
                src={uploadPreviewUrl}
                alt='Preview'
                className={styles.previewImg}
              />
            ) : (
              <div className={styles.previewImg} aria-hidden='true' />
            )}
            <div style={{ flex: "1 1 240px", minWidth: 0 }}>
              <input
                ref={fileInputRef}
                type='file'
                accept={IMAGE_TIERS.gallery.acceptedMimes.join(",")}
                className={styles.fileInputHidden}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelected(file);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                aria-label='Choose image to upload'
              />
              <Btn onClick={() => fileInputRef.current?.click()}>
                {uploadFile ? "Replace file" : "Choose file…"}
              </Btn>
              <p className={styles.uploadHint}>
                {IMAGE_TIERS.gallery.acceptedLabel} · max{" "}
                {IMAGE_TIERS.gallery.maxBytesLabel} · resized to 2000 px
              </p>
            </div>
          </div>

          <Input
            type='text'
            label='Name'
            id='gallery-upload-name'
            fullWidth
            value={uploadName}
            placeholder='Image name'
            onChange={(e) => {
              setUploadName(e.target.value);
            }}
          />
          <Input
            type='text'
            label='Tags (comma-separated)'
            id='gallery-upload-tags'
            fullWidth
            value={uploadTags}
            placeholder='e.g. hero, frodo, ring'
            onChange={(e) => {
              setUploadTags(e.target.value);
            }}
          />
          {orgs.length > 0 && (
            <Dropdown
              label='Share with'
              id='gallery-upload-org'
              value={uploadOrgId ? [uploadOrgId] : [""]}
              onChange={(vals) => {
                setUploadOrgId(vals[0] ?? "");
              }}
              options={[
                { value: "", label: "Private (only me)" },
                ...orgs.map((org) => ({
                  value: org.id ?? "",
                  label: org.name ?? "",
                })),
              ]}
            />
          )}

          {uploadError && <p className={styles.error}>{uploadError}</p>}

          <div className={styles.formActions}>
            <Btn
              onClick={() => {
                void handleUpload();
              }}
              disabled={isUploading || !uploadFile}>
              {isUploading ? "Uploading..." : "Upload and use"}
            </Btn>
            <Btn
              onClick={() => {
                setUploadMode(false);
                setUploadFile(null);
                setUploadPreviewUrl(null);
                setUploadError(null);
              }}>
              Cancel
            </Btn>
          </div>
        </div>
      )}

      {!uploadMode && (
        <>
          {isLoading && <p>Loading…</p>}
          {!isLoading && filteredImages.length === 0 && (
            <EmptyState
              className={styles.empty}
              title='No images yet'
              message={
                images.length === 0
                  ? "Upload your first image to start your gallery."
                  : "No images match your filters."
              }
              action={
                images.length === 0 ? (
                  <Btn
                    onClick={() => {
                      setUploadMode(true);
                    }}>
                    Upload an image
                  </Btn>
                ) : null
              }
            />
          )}
          {!isLoading && filteredImages.length > 0 && (
            <div className={styles.grid}>{filteredImages.map(renderTile)}</div>
          )}
        </>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn onClick={onClose}>Close</Btn>
      </div>
    </div>
  );
};

export { GalleryPicker };
