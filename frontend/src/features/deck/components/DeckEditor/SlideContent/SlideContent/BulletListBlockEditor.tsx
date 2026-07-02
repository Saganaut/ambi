// Bullet-list block author surface. Renders one input per bullet with an
// inline remove. Min/max item counts are enforced inside this component;
// the add button disables itself at the max.
import { MinusIcon } from "@heroicons/react/24/outline";
import { Btn } from "@ui/Buttons/Btn";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { Input } from "@components/Forms/Input/Input/Input";
import type { BulletListBlock, BlockUpdate } from "./Block.types";
import styles from "./SlideContent.module.css";

const MIN_BULLET_ITEMS = 1;
const MAX_BULLET_ITEMS = 12;

interface BulletListBlockEditorProps {
  block: BulletListBlock;
  onUpdate: BlockUpdate;
  onFlush: () => void;
}

const BulletListBlockEditor = ({
  block,
  onUpdate,
  onFlush,
}: BulletListBlockEditorProps) => {
  const items = block.items ?? [];
  const updateItems = (
    nextItems: string[],
    mode: "schedule" | "commit" = "schedule",
  ) => {
    onUpdate({ ...block, items: nextItems }, mode);
  };

  return (
    <div className={styles.blockBody}>
      {items.map((item, idx) => (
        <div key={`${block.id}-${idx.toString()}`} className={styles.bulletRow}>
          <div className={styles.bulletRowField}>
            <Input
              type='text'
              fullWidth
              value={item}
              placeholder={`Bullet ${(idx + 1).toString()}`}
              onChange={(e) => {
                const next = [...items];
                next[idx] = e.target.value;
                updateItems(next);
              }}
              onBlur={onFlush}
            />
          </div>
          <IconBtn
            fill='ghost'
            size='xs'
            icon={<MinusIcon />}
            aria-label={`Remove bullet ${(idx + 1).toString()}`}
            disabled={items.length <= MIN_BULLET_ITEMS}
            onClick={() => {
              const next = items.filter((_, i) => i !== idx);
              updateItems(next, "commit");
            }}
          />
        </div>
      ))}
      <Btn
        size='sm'
        disabled={items.length >= MAX_BULLET_ITEMS}
        onClick={() => {
          updateItems([...items, ""], "commit");
        }}>
        + Add bullet
      </Btn>
    </div>
  );
};

export { BulletListBlockEditor };
