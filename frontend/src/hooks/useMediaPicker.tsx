// Opens the MediaPicker in the global modal, filtered to a single media kind,
// with a caller-supplied pick handler. The picker hands back the full
// MediaAssetResponse — id, kind, presigned URL (audio/video files), variants
// (images), or embedUrl (video embeds). Callers typically only need
// `created.id` to persist as a *AssetId pointer on a DeckElement, but the
// full payload is provided so the editor can render an inline preview without
// a second fetch.
//
// Usage:
//   const openMediaPicker = useMediaPicker();
//   openMediaPicker("AUDIO", (asset) => {
//     commit({ ...element, audioAssetId: asset.id });
//   });
//
// The picker self-closes after onPick is invoked.
import { useCallback } from "react";

import { MediaPicker } from "@/components/Common/MediaPicker/MediaPicker";
import type { MediaAssetResponse } from "@/store/AmbiApi";
import type { MediaKind } from "@/utils/mediaValidation";
import { usePickerModal } from "./usePickerModal";

type PickHandler = (asset: MediaAssetResponse) => void;

const KIND_TITLE: Record<MediaKind, string> = {
  IMAGE: "Choose an image",
  AUDIO: "Choose audio",
  VIDEO_FILE: "Choose a video",
  VIDEO_EMBED: "Add a video link",
};

const useMediaPicker = (): ((kind: MediaKind, onPick: PickHandler) => void) => {
  const openPicker = usePickerModal();

  return useCallback(
    (kind: MediaKind, onPick: PickHandler) => {
      openPicker({
        title: KIND_TITLE[kind],
        content: (autoClose) => (
          <MediaPicker
            kind={kind}
            onPick={(asset) => {
              onPick(asset);
              autoClose();
            }}
            onClose={autoClose}
          />
        ),
      });
    },
    [openPicker],
  );
};

export { useMediaPicker };
