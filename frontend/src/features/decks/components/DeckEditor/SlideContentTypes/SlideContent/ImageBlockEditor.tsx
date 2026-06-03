// Image-block author surface. Paste a URL (becomes an external image) or
// leave blank. Caption is optional. Gallery picker integration shipped with
// the wider deck editor — see the standalone ImageBackingEditor; this one
// stays URL-only for now because image blocks aren't always backed by the
// gallery (e.g. lecture content).
import { Input } from "@components/Forms/Input/Input/Input";
import { largestUrl } from "@utils/image";
import type { Image } from "@store/AmbiApi";
import type { ImageBlock } from "@store/slideBlockTypes";
import type { BlockUpdate } from "./types";
import styles from "./SlideContent.module.css";

interface ImageBlockEditorProps {
  block: ImageBlock;
  onUpdate: BlockUpdate;
  onFlush: () => void;
}

/** Materialize an external Image record from a typed URL. Mirrors the shape
 *  the backend's `Image.external(url)` factory produces. */
const makeExternalImage = (url: string): Image => ({
  useExternalImg: true,
  externalUrl: url,
  variants: {},
});

const ImageBlockEditor = ({
  block,
  onUpdate,
  onFlush,
}: ImageBlockEditorProps) => {
  const externalUrl: string = block.image?.useExternalImg
    ? (largestUrl(block.image, "") ?? "")
    : "";
  return (
    <div className={styles.blockBody}>
      <Input
        label='Image URL'
        id={`image-url-${block.id}`}
        type='text'
        fullWidth
        value={externalUrl}
        placeholder='https://…'
        onChange={(e) => {
          const url = e.target.value.trim();
          onUpdate(
            { ...block, image: url ? makeExternalImage(url) : undefined },
            "schedule",
          );
        }}
        onBlur={onFlush}
      />
      {externalUrl && (
        <img
          src={externalUrl}
          alt={block.caption ?? ""}
          className={styles.imagePreview}
        />
      )}
      <Input
        label='Caption'
        id={`image-caption-${block.id}`}
        type='text'
        fullWidth
        value={block.caption ?? ""}
        placeholder='Optional caption shown under the image'
        onChange={(e) => {
          onUpdate({ ...block, caption: e.target.value }, "schedule");
        }}
        onBlur={onFlush}
      />
    </div>
  );
};

export { ImageBlockEditor };
