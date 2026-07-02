// Callout-block author surface. Tone picker + rich-text body. Tone changes
// commit immediately (tone changes the renderer's outer chrome).
import { Dropdown } from "@components/Forms/Input/Dropdown/Dropdown";
import { RichTextInput } from "@components/Forms/Input/RichTextInput/RichTextInput";
import {
  CALLOUT_TONES,
  type BlockUpdate,
  type CalloutBlock,
  type CalloutTone,
} from "./Block.types";
import styles from "./SlideContent.module.css";

interface CalloutBlockEditorProps {
  block: CalloutBlock;
  onUpdate: BlockUpdate;
  onFlush: () => void;
}

const CalloutBlockEditor = ({
  block,
  onUpdate,
  onFlush,
}: CalloutBlockEditorProps) => {
  return (
    <div className={styles.blockBody}>
      <Dropdown
        id={`callout-tone-${block.id}`}
        label='Tone'
        options={CALLOUT_TONES}
        value={[block.tone ?? "INFO"]}
        onChange={(values) => {
          const next = (values[0] ?? "INFO") as CalloutTone;
          onUpdate({ ...block, tone: next }, "commit");
        }}
      />
      <RichTextInput
        label='Callout body'
        id={`callout-body-${block.id}`}
        placeholder='Short, tinted text…'
        value={block.richBody ?? ""}
        onChange={(html) => {
          onUpdate({ ...block, richBody: html }, "schedule");
        }}
        onBlur={onFlush}
      />
    </div>
  );
};

export { CalloutBlockEditor };
