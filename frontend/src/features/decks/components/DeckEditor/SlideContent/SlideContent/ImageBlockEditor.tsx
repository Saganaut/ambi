// Image-block author surface. Paste a URL (becomes an external image) or
// leave blank. Caption is optional. Gallery picker integration shipped with
// the wider deck editor — see the standalone ImageBackingEditor; this one
// stays URL-only for now because image blocks aren't always backed by the
// gallery (e.g. lecture content).
import { Input } from "@components/Forms/Input/Input/Input";
import { externalImage } from "@utils/image";
import type { ImageBlock, BlockUpdate } from "./types";
import styles from "./SlideContent.module.css";

interface ImageBlockEditorProps {
  block: ImageBlock;
  onUpdate: BlockUpdate;
  onFlush: () => void;
}

const ImageBlockEditor = ({
  block,
  onUpdate,
  onFlush,
}: ImageBlockEditorProps) => {
  // Image blocks are URL-backed for now (no gallery binding), so the only
  // renderable source is an external image's `externalSrc`.
  const externalUrl = block.image?.external ? (block.image.externalSrc ?? "") : "";
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
            { ...block, image: url ? externalImage(url) : undefined },
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
