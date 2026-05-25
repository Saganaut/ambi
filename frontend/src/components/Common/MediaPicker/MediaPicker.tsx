// Kind-filterable modal body that lets a slide-editor caller pick a media
// asset (image / audio / video file / video embed) from the user's media
// library — their own uploads plus anything shared with their orgs. Includes
// an inline upload form (file picker for IMAGE/AUDIO/VIDEO_FILE; URL paste
// for VIDEO_EMBED) so authors can add new media without leaving the editor.
//
// Click a tile → onPick(asset) fires with the full MediaAssetResponse; the
// caller is responsible for closing the modal and persisting whichever id
// pointer it needs (e.g. videoAssetId / audioAssetId on a DeckElement).
//
// Per-kind tile chrome:
//   IMAGE        – SM image variant thumb
//   AUDIO        – SpeakerWave icon placeholder
//   VIDEO_FILE   – VideoCamera icon placeholder
//   VIDEO_EMBED  – Play icon placeholder (renders a thumbnail in a follow-up
//                  once we extract YouTube/Vimeo thumb URLs)
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PhotoIcon,
  PlayCircleIcon,
  SpeakerWaveIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";

import {
  useListMediaQuery,
  useUploadMediaMutation,
  useCreateMediaEmbedMutation,
  type MediaAssetResponse,
} from "@/store/BrainFlexApi";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCurrentUserOrgs } from "@/hooks/useCurrentUserOrgs";
import { Btn } from "@/components/Common/Buttons/Btn";
import { Input } from "@/components/Common/Input/Input/Input";
import { Dropdown } from "@/components/Common/Input/Dropdown/Dropdown";
import { EmptyState } from "@/components/Common/EmptyState/EmptyState";
import { variantFor } from "@/utils/image";
import { extractErrorMessage } from "@/utils/utils";
import {
  MEDIA_TIERS,
  isFileMediaKind,
  validateMediaFile,
  type MediaKind,
} from "@/utils/mediaValidation";

import styles from "./MediaPicker.module.css";

interface MediaPickerProps {
  /** Required: limits the picker to a single media kind. */
  kind: MediaKind;
  onPick: (asset: MediaAssetResponse) => void;
  onClose: () => void;
}

const ALL_TAGS_KEY = "__all__";

const KIND_LABEL: Record<MediaKind, { noun: string; uploadCta: string }> = {
  IMAGE: { noun: "image", uploadCta: "Upload new image" },
  AUDIO: { noun: "audio file", uploadCta: "Upload new audio" },
  VIDEO_FILE: { noun: "video", uploadCta: "Upload new video" },
  VIDEO_EMBED: { noun: "video link", uploadCta: "Add video link" },
};

const MediaPicker = ({ kind, onPick, onClose }: MediaPickerProps) => {
  const userState = useCurrentUser();
  const ownerId =
    userState.state === "registered" ? (userState.user.id ?? null) : null;
  const { data: orgs = [] } = useCurrentUserOrgs();
  const { data: assets = [], isLoading } = useListMediaQuery({ kind });
  const [uploadMedia, { isLoading: isUploading }] = useUploadMediaMutation();
  const [createEmbed, { isLoading: isCreatingEmbed }] =
    useCreateMediaEmbedMutation();

  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string>(ALL_TAGS_KEY);
  const [uploadMode, setUploadMode] = useState(false);

  // File-upload form state (used for IMAGE/AUDIO/VIDEO_FILE)
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadOrgId, setUploadOrgId] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // VIDEO_EMBED state
  const [embedUrl, setEmbedUrl] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((asset) => {
      (asset.tags ?? []).forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [assets]);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((asset) => {
      const tags = asset.tags ?? [];
      if (activeTag !== ALL_TAGS_KEY && !tags.includes(activeTag)) return false;
      if (q) {
        const haystack = `${asset.name ?? ""} ${tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [assets, activeTag, search]);

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
    if (!isFileMediaKind(kind)) {
      setUploadError("Files are not accepted for this media kind.");
      return;
    }
    const err = validateMediaFile(file, kind);
    if (err) {
      setUploadError(err);
      return;
    }
    setUploadFile(file);
    // Only image kinds get an inline preview; audio/video skip it.
    if (kind === "IMAGE") {
      setUploadPreviewUrl(URL.createObjectURL(file));
    } else {
      setUploadPreviewUrl(null);
    }
    if (!uploadName) setUploadName(file.name.replace(/\.[^.]+$/, ""));
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setUploadError(`Choose a ${KIND_LABEL[kind].noun} to upload.`);
      return;
    }
    // The file goes in multipart FormData; the discriminator + name/tags/org
    // ride along as URL query params (the codegen separates @RequestParam from
    // multipart automatically). Raw-FormData cast is the same escape hatch
    // AccountPage.uploadProfileImage uses.
    const formData = new FormData();
    formData.append("file", uploadFile);

    setUploadError(null);
    try {
      const created = await uploadMedia({
        kind,
        name: uploadName.trim() || undefined,
        tags: uploadTags.trim() || undefined,
        organizationId: uploadOrgId || undefined,
        body: formData as unknown as { file: Blob },
      }).unwrap();
      resetForms();
      onPick(created);
    } catch (err: unknown) {
      setUploadError(
        extractErrorMessage(err, "Upload failed. Please try again."),
      );
    }
  };

  const handleCreateEmbed = async () => {
    if (!embedUrl.trim()) {
      setUploadError("Paste a YouTube or Vimeo URL.");
      return;
    }
    setUploadError(null);
    try {
      const created = await createEmbed({
        createEmbedRequest: {
          url: embedUrl.trim(),
          name: uploadName.trim() || undefined,
          tags: uploadTags.trim()
            ? uploadTags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : undefined,
          organizationId: uploadOrgId || undefined,
        },
      }).unwrap();
      resetForms();
      onPick(created);
    } catch (err: unknown) {
      setUploadError(
        extractErrorMessage(
          err,
          "Could not create embed. Check the URL and try again.",
        ),
      );
    }
  };

  const resetForms = () => {
    setUploadFile(null);
    setUploadPreviewUrl(null);
    setUploadName("");
    setUploadTags("");
    setUploadOrgId("");
    setEmbedUrl("");
    setUploadMode(false);
  };

  const renderTile = (asset: MediaAssetResponse) => {
    const isShared = ownerId !== null && asset.ownerId !== ownerId;
    return (
      <button
        type='button'
        key={asset.id}
        className={styles.tile}
        onClick={() => {
          onPick(asset);
        }}>
        {renderThumb(asset)}
        <span className={styles.tileName} title={asset.name}>
          {asset.name}
        </span>
        <span className={styles.tileMeta}>
          {isShared && <span className={styles.tileBadge}>Org</span>}
          {(asset.tags ?? []).slice(0, 2).map((t) => (
            <span key={t} className={styles.tileBadge}>
              {t}
            </span>
          ))}
        </span>
      </button>
    );
  };

  const renderThumb = (asset: MediaAssetResponse) => {
    if (asset.kind === "IMAGE") {
      const thumb = variantFor(
        {
          useExternalImg: false,
          internalImgId: asset.id ?? "",
          variants: asset.variants ?? {},
        },
        "SM",
      );
      if (thumb?.url) {
        return <img src={thumb.url} alt={asset.name} className={styles.thumb} />;
      }
      return (
        <div className={styles.thumb} aria-hidden='true'>
          <PhotoIcon className={styles.thumbPlaceholderIcon} />
        </div>
      );
    }
    const Icon =
      asset.kind === "AUDIO"
        ? SpeakerWaveIcon
        : asset.kind === "VIDEO_FILE"
          ? VideoCameraIcon
          : PlayCircleIcon;
    return (
      <div className={styles.thumb} aria-hidden='true'>
        <Icon className={styles.thumbPlaceholderIcon} />
      </div>
    );
  };

  const fileTier = isFileMediaKind(kind) ? MEDIA_TIERS[kind] : null;
  const isEmbedKind = kind === "VIDEO_EMBED";

  return (
    <div className={styles.picker}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <div className={styles.searchInput}>
            <Input
              type='text'
              fullWidth
              ariaLabel='Search media by name or tag'
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
            {uploadMode ? "Cancel" : KIND_LABEL[kind].uploadCta}
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
          {isEmbedKind ? (
            <Input
              type='text'
              label='Video URL'
              id='media-embed-url'
              fullWidth
              placeholder='https://www.youtube.com/watch?v=… or https://vimeo.com/…'
              value={embedUrl}
              onChange={(e) => {
                setEmbedUrl(e.target.value);
              }}
            />
          ) : (
            <div className={styles.uploadFormRow}>
              {uploadPreviewUrl ? (
                <img
                  src={uploadPreviewUrl}
                  alt='Preview'
                  className={styles.previewImg}
                />
              ) : (
                <div className={styles.previewImg} aria-hidden='true'>
                  {kind === "AUDIO" && (
                    <SpeakerWaveIcon className={styles.thumbPlaceholderIcon} />
                  )}
                  {kind === "VIDEO_FILE" && (
                    <VideoCameraIcon className={styles.thumbPlaceholderIcon} />
                  )}
                </div>
              )}
              <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept={fileTier?.acceptedMimes.join(",")}
                  className={styles.fileInputHidden}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  aria-label={`Choose ${KIND_LABEL[kind].noun} to upload`}
                />
                <Btn onClick={() => fileInputRef.current?.click()}>
                  {uploadFile ? "Replace file" : "Choose file…"}
                </Btn>
                {fileTier && (
                  <p className={styles.uploadHint}>
                    {fileTier.acceptedLabel} · max {fileTier.maxBytesLabel}
                  </p>
                )}
                {uploadFile && (
                  <p className={styles.uploadHint} title={uploadFile.name}>
                    {uploadFile.name}
                  </p>
                )}
              </div>
            </div>
          )}

          <Input
            type='text'
            label='Name'
            id='media-upload-name'
            fullWidth
            value={uploadName}
            placeholder={`${KIND_LABEL[kind].noun} name`}
            onChange={(e) => {
              setUploadName(e.target.value);
            }}
          />
          <Input
            type='text'
            label='Tags (comma-separated)'
            id='media-upload-tags'
            fullWidth
            value={uploadTags}
            placeholder='e.g. intro, theme, ambient'
            onChange={(e) => {
              setUploadTags(e.target.value);
            }}
          />
          {orgs.length > 0 && (
            <Dropdown
              label='Share with'
              id='media-upload-org'
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
                if (isEmbedKind) {
                  void handleCreateEmbed();
                } else {
                  void handleUpload();
                }
              }}
              disabled={
                isUploading ||
                isCreatingEmbed ||
                (isEmbedKind ? !embedUrl.trim() : !uploadFile)
              }>
              {isUploading || isCreatingEmbed ? "Saving…" : "Save and use"}
            </Btn>
            <Btn
              onClick={() => {
                resetForms();
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
          {!isLoading && filteredAssets.length === 0 && (
            <EmptyState
              className={styles.empty}
              title={`No ${KIND_LABEL[kind].noun}s yet`}
              message={
                assets.length === 0
                  ? `Add your first ${KIND_LABEL[kind].noun} to start your library.`
                  : `No ${KIND_LABEL[kind].noun}s match your filters.`
              }
              action={
                assets.length === 0 ? (
                  <Btn
                    onClick={() => {
                      setUploadMode(true);
                    }}>
                    {KIND_LABEL[kind].uploadCta}
                  </Btn>
                ) : null
              }
            />
          )}
          {!isLoading && filteredAssets.length > 0 && (
            <div className={styles.grid}>{filteredAssets.map(renderTile)}</div>
          )}
        </>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn onClick={onClose}>Close</Btn>
      </div>
    </div>
  );
};

export { MediaPicker };
