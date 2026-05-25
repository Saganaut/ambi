// Heading block author surface. Exposes a text field for the heading content
// and a level dropdown (H1 / H2 / H3). Level changes commit immediately —
// they're structural for the renderer.
import { Input } from "@/components/Common/Input/Input/Input";
import { Dropdown } from "@/components/Common/Input/Dropdown/Dropdown";
import type { HeadingBlock } from "@/store/slideBlockTypes";
import { HEADING_LEVELS, type BlockUpdate } from "./types";
import styles from "./SlideContent.module.css";

interface HeadingBlockEditorProps {
  block: HeadingBlock;
  onUpdate: BlockUpdate;
  onFlush: () => void;
}

const HeadingBlockEditor = ({
  block,
  onUpdate,
  onFlush,
}: HeadingBlockEditorProps) => {
  return (
    <div className={styles.headingRow}>
      <Input
        label='Heading text'
        id={`heading-text-${block.id}`}
        type='text'
        fullWidth
        value={block.text ?? ""}
        placeholder='Section heading…'
        onChange={(e) => { onUpdate({ ...block, text: e.target.value }, "schedule"); }}
        onBlur={onFlush}
      />
      <Dropdown
        id={`heading-level-${block.id}`}
        label='Level'
        options={HEADING_LEVELS}
        value={[(block.level ?? 2).toString()]}
        onChange={(values) => {
          const next = parseInt(values[0] ?? "2", 10);
          onUpdate({ ...block, level: next }, "commit");
        }}
      />
    </div>
  );
};

export { HeadingBlockEditor };
