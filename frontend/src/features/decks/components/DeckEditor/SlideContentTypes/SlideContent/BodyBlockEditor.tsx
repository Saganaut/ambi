// Body-text block author surface. Wraps a single rich-text input — all the
// real authoring happens inside TipTap.

import { RichTextInput } from "@components/Forms/Input/RichTextInput/RichTextInput";
import { BodyBlock } from "@store/slideBlockTypes";
import type { BlockUpdate } from "./types";

interface BodyBlockEditorProps {
  block: BodyBlock;
  onUpdate: BlockUpdate;
  onFlush: () => void;
}

const BodyBlockEditor = ({
  block,
  onUpdate,
  onFlush,
}: BodyBlockEditorProps) => {
  return (
    <RichTextInput
      label='Body'
      id={`body-rich-${block.id}`}
      placeholder='Slide content…'
      value={block.richBody ?? ""}
      onChange={(html) => {
        onUpdate({ ...block, richBody: html }, "schedule");
      }}
      onBlur={onFlush}
    />
  );
};

export { BodyBlockEditor };
