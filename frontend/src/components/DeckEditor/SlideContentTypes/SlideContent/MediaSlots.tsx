// Audio + video media-picker slots used at the bottom of the slide editor.
// Each row shows the picked asset (via MediaAssetChip) and exposes "Replace"
// + "Remove" actions; an empty slot offers an "Add" button.
//
// Chunk 25 — the audio/video reference fields live on {@link ElementChrome},
// so the patch shape sits inside the chrome subdocument rather than at the
// element top level.
import { Btn } from "@/components/Common/Buttons/Btn";
import { MediaAssetChip } from "@/components/Common/MediaPicker/MediaAssetChip";
import { useMediaPicker } from "@/hooks/useMediaPicker";
import type { ElementChrome, Slide } from "@/store/AmbiApi";
import styles from "./SlideContent.module.css";

/** Narrow patch shape — MediaSlots only ever touches the audio/video chrome
 *  fields. The parent commits this nested under `chrome:` on the element. */
type MediaPatch = Pick<
  ElementChrome,
  "audioAssetId" | "audioUrl" | "videoAssetId" | "videoUrl"
>;

interface MediaSlotsProps {
  element: Slide;
  onCommit: (patch: MediaPatch) => void;
  onFlush: () => void;
}

const MediaSlots = ({ element, onCommit, onFlush }: MediaSlotsProps) => {
  const openMediaPicker = useMediaPicker();
  const audioAssetId = element.chrome?.audioAssetId;
  const videoAssetId = element.chrome?.videoAssetId;

  return (
    <>
      <div className={styles.mediaRow}>
        <MediaAssetChip
          label='Audio'
          assetId={audioAssetId}
          onReplace={() => {
            onFlush();
            openMediaPicker("AUDIO", (asset) => {
              onCommit({ audioAssetId: asset.id, audioUrl: undefined });
            });
          }}
          onRemove={() => {
            onFlush();
            onCommit({ audioAssetId: undefined, audioUrl: undefined });
          }}
        />
        {!audioAssetId && (
          <Btn
            size='sm'
            onClick={() => {
              onFlush();
              openMediaPicker("AUDIO", (asset) => {
                onCommit({ audioAssetId: asset.id, audioUrl: undefined });
              });
            }}>
            Add audio
          </Btn>
        )}
      </div>

      <div className={styles.mediaRow}>
        <MediaAssetChip
          label='Video'
          assetId={videoAssetId}
          onReplace={() => {
            onFlush();
            openMediaPicker("VIDEO_FILE", (asset) => {
              onCommit({ videoAssetId: asset.id, videoUrl: undefined });
            });
          }}
          onRemove={() => {
            onFlush();
            onCommit({ videoAssetId: undefined, videoUrl: undefined });
          }}
        />
        {!videoAssetId && (
          <>
            <Btn
              size='sm'
              onClick={() => {
                onFlush();
                openMediaPicker("VIDEO_FILE", (asset) => {
                  onCommit({ videoAssetId: asset.id, videoUrl: undefined });
                });
              }}>
              Add video
            </Btn>
            <Btn
              size='sm'
              onClick={() => {
                onFlush();
                openMediaPicker("VIDEO_EMBED", (asset) => {
                  onCommit({ videoAssetId: asset.id, videoUrl: undefined });
                });
              }}>
              Add video link
            </Btn>
          </>
        )}
      </div>
    </>
  );
};

export { MediaSlots };
