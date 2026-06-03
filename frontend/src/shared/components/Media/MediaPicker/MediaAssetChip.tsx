// Read-only summary of a chosen MediaAsset shown inline in a deck-element
// editor — the visible result of a MediaPicker selection. Hydrates the asset
// from the server by id (so URL refreshes follow the same presign cycle as
// every other read), then renders a chip with the asset name + a small
// preview (<audio>, <video>, or iframe) plus action buttons supplied by the
// caller (typically "Replace" + "Remove").
//
// If `assetId` is empty/undefined, renders nothing — callers gate the chip's
// visibility by simply passing the persisted id.
import {
  PlayCircleIcon,
  SpeakerWaveIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";

import { Btn } from "@common/Buttons/Btn";

import styles from "./MediaAssetChip.module.css";

interface MediaAssetChipProps {
  label: string;
  assetId: string | null | undefined;
  onReplace: () => void;
  onRemove: () => void;
  /** When false, the preview player / iframe is hidden — only the chip line shows. */
  showPreview?: boolean;
}

const MediaAssetChip = ({
  label,
  assetId,
  onReplace,
  onRemove,
  showPreview = true,
}: MediaAssetChipProps) => {
  const { data: asset, isLoading } = useGetMediaQuery(
    { id: assetId ?? "" },
    { skip: !assetId },
  );

  if (!assetId) return null;

  return (
    <div className={styles.chipRow}>
      <span className={styles.chipLabel}>{label}</span>
      <div className={styles.chip}>
        {renderIcon(asset)}
        <span className={styles.name}>
          {isLoading && <span className={styles.muted}>Loading…</span>}
          {!isLoading &&
            (asset?.name ?? (
              <span className={styles.muted}>Asset not found</span>
            ))}
        </span>
        <div className={styles.actions}>
          <Btn size='sm' onClick={onReplace}>
            Replace
          </Btn>
          <Btn size='sm' onClick={onRemove}>
            Remove
          </Btn>
        </div>
      </div>
      {showPreview && asset && (
        <div className={styles.preview}>{renderPreview(asset)}</div>
      )}
    </div>
  );
};

const renderIcon = (asset: MediaAssetResponse | undefined) => {
  if (asset?.kind === "AUDIO")
    return <SpeakerWaveIcon className={styles.icon} aria-hidden='true' />;
  if (asset?.kind === "VIDEO_FILE")
    return <VideoCameraIcon className={styles.icon} aria-hidden='true' />;
  return <PlayCircleIcon className={styles.icon} aria-hidden='true' />;
};

const renderPreview = (asset: MediaAssetResponse) => {
  if (asset.kind === "AUDIO" && asset.url) {
    return (
      <audio
        className={styles.audioPreview}
        controls
        preload='metadata'
        src={asset.url}>
        Your browser does not support the audio element.
      </audio>
    );
  }
  if (asset.kind === "VIDEO_FILE" && asset.url) {
    return (
      <video
        className={styles.videoPreview}
        controls
        preload='metadata'
        src={asset.url}>
        Your browser does not support the video element.
      </video>
    );
  }
  if (asset.kind === "VIDEO_EMBED" && asset.url) {
    return (
      <iframe
        className={styles.embedPreview}
        src={asset.url}
        title={asset.name ?? "Video"}
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        allowFullScreen
      />
    );
  }
  return null;
};

export { MediaAssetChip };
