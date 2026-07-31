// Crop + details step of the Upload tab. The user frames the image within the
// crop box (its aspect comes from the caller's target slot — usually a fixed
// width/height ratio), adjusts zoom, and supplies a name + alt text.
// react-easy-crop reports
// `croppedAreaPixels` already in the source image's natural-pixel space, so the
// area we hand back can be fed straight to `getCroppedBlob`.
//
// Callers whose slot has no shape of its own pass `aspect: "source"`: the crop
// box takes the uploaded image's own aspect ratio, so at zoom 1 it covers the
// whole image and nothing is clipped unless the user zooms in deliberately.
// react-easy-crop only crops to a fixed numeric aspect, so "source" resolves to
// the natural ratio once the media loads.
import { useState } from "react";
import Cropper from "react-easy-crop";
import type { Area, MediaSize, Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { Btn } from "@ui/Buttons/Btn";
import { Input } from "@components/Forms/Input/Input/Input";
import type { PixelArea } from "@utils/imageEditing";
import styles from "./GalleryPicker.module.css";

interface ImageCropEditorProps {
  /** Object/blob URL of the source image being cropped. */
  imageSrc: string;
  /** Crop box aspect ratio (width / height), or "source" to match the image's own. */
  aspect: number | "source";
  /** Prefill for the name field (e.g. the source filename). */
  initialName?: string;
  /** Prefill for the alt-text field (e.g. the source image's own alt text). */
  initialAltText?: string;
  /** True while the parent is cropping + uploading. */
  isSaving: boolean;
  /** Surfaced upload/crop error, if any. */
  error?: string | null;
  onCancel: () => void;
  onConfirm: (result: {
    area: PixelArea;
    name: string;
    altText: string;
  }) => void;
}

const ImageCropEditor = ({
  imageSrc,
  aspect,
  initialName,
  initialAltText,
  isSaving,
  error,
  onCancel,
  onConfirm,
}: ImageCropEditorProps) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<PixelArea | null>(null);
  const [name, setName] = useState(initialName ?? "");
  const [altText, setAltText] = useState(initialAltText ?? "");
  // The image's own ratio, learned when the media loads ("source" mode only).
  // Until then the box is square for one paint; the cropper re-fits on change.
  const [sourceAspect, setSourceAspect] = useState<number | null>(null);
  const resolvedAspect = aspect === "source" ? (sourceAspect ?? 1) : aspect;

  const handleConfirm = () => {
    if (!area) return;
    onConfirm({ area, name: name.trim(), altText: altText.trim() });
  };

  return (
    <div className={styles.editor}>
      <div className={styles.cropArea}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={resolvedAspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onMediaLoaded={(mediaSize: MediaSize) => {
            if (aspect !== "source" || mediaSize.naturalHeight === 0) return;
            setSourceAspect(mediaSize.naturalWidth / mediaSize.naturalHeight);
          }}
          onCropComplete={(_: Area, areaPixels: Area) => {
            setArea(areaPixels);
          }}
        />
      </div>

      <label className={styles.zoomRow}>
        <span>Zoom</span>
        <input
          type='range'
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          aria-label='Zoom'
          onChange={(e) => {
            setZoom(Number(e.target.value));
          }}
        />
      </label>

      <Input
        label='Name'
        fullWidth
        ariaLabel='Image name'
        placeholder='A short name for this image'
        value={name}
        onChange={(e) => {
          setName(e.target.value);
        }}
      />
      <Input
        label='Alt text'
        fullWidth
        ariaLabel='Image alt text'
        placeholder='Describe the image for screen readers'
        value={altText}
        onChange={(e) => {
          setAltText(e.target.value);
        }}
      />

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.editorActions}>
        <Btn fill='ghost' onClick={onCancel} disabled={isSaving}>
          Back
        </Btn>
        <Btn onClick={handleConfirm} disabled={!area || isSaving}>
          {isSaving ? "Saving…" : "Use image"}
        </Btn>
      </div>
    </div>
  );
};

export { ImageCropEditor };
