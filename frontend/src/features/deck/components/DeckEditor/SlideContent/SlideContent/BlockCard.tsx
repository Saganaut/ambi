// Wrapper card for one block in the slide's block list. Owns the header
// chrome (kind badge + up/down/remove) and dispatches to the appropriate
// per-kind editor for the body.
import {
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { IconBtn } from "@ui/Buttons/IconBtn";
import {
  BLOCK_KIND_LABEL,
  type BlockUpdate,
  type SlideBlockUnion,
} from "./Block.types";
import { HeadingBlockEditor } from "./HeadingBlockEditor";
import { BodyBlockEditor } from "./BodyBlockEditor";
import { BulletListBlockEditor } from "./BulletListBlockEditor";
import { ImageBlockEditor } from "./ImageBlockEditor";
import { CalloutBlockEditor } from "./CalloutBlockEditor";
import styles from "./SlideContent.module.css";

interface BlockCardProps {
  block: SlideBlockUnion;
  index: number;
  total: number;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onUpdate: BlockUpdate;
  onFlush: () => void;
}

const BlockCard = ({
  block,
  index,
  total,
  onRemove,
  onMove,
  onUpdate,
  onFlush,
}: BlockCardProps) => {
  return (
    <div className={styles.blockCard}>
      <div className={styles.blockCardHeader}>
        <span className={styles.blockKindBadge}>
          <span className={styles.blockCardIndex}>{index + 1}</span>
          {BLOCK_KIND_LABEL[block.kind]}
        </span>
        <div className={styles.blockCardActions}>
          <IconBtn
            fill='ghost'
            size='xs'
            icon={<ChevronUpIcon />}
            aria-label='Move block up'
            disabled={index === 0}
            onClick={() => {
              onMove(block.id, -1);
            }}
          />
          <IconBtn
            fill='ghost'
            size='xs'
            icon={<ChevronDownIcon />}
            aria-label='Move block down'
            disabled={index === total - 1}
            onClick={() => {
              onMove(block.id, 1);
            }}
          />
          <IconBtn
            fill='ghost'
            size='xs'
            icon={<TrashIcon />}
            aria-label='Remove block'
            onClick={() => {
              onRemove(block.id);
            }}
          />
        </div>
      </div>
      <BlockBody block={block} onUpdate={onUpdate} onFlush={onFlush} />
    </div>
  );
};

interface BlockBodyProps {
  block: SlideBlockUnion;
  onUpdate: BlockUpdate;
  onFlush: () => void;
}

const BlockBody = ({ block, onUpdate, onFlush }: BlockBodyProps) => {
  switch (block.kind) {
    case "HeadingBlock":
      return (
        <HeadingBlockEditor
          block={block}
          onUpdate={onUpdate}
          onFlush={onFlush}
        />
      );
    case "BodyBlock":
      return (
        <BodyBlockEditor block={block} onUpdate={onUpdate} onFlush={onFlush} />
      );
    case "BulletListBlock":
      return (
        <BulletListBlockEditor
          block={block}
          onUpdate={onUpdate}
          onFlush={onFlush}
        />
      );
    case "ImageBlock":
      return (
        <ImageBlockEditor block={block} onUpdate={onUpdate} onFlush={onFlush} />
      );
    case "CalloutBlock":
      return (
        <CalloutBlockEditor
          block={block}
          onUpdate={onUpdate}
          onFlush={onFlush}
        />
      );
  }
};

export { BlockCard };
