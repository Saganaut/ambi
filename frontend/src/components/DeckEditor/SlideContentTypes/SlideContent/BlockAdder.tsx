// "Add block" affordance: pick a kind, click confirm. The dropdown keeps a
// local pending pick so the user can preview the label before committing.
import { useState } from "react";
import { PlusIcon } from "@heroicons/react/24/solid";
import { Btn } from "@/components/Common/Buttons/Btn";
import { Dropdown } from "@/components/Common/Input/Dropdown/Dropdown";
import type { SlideBlockKind } from "@/store/slideBlockTypes";
import { BLOCK_KIND_OPTIONS } from "./types";
import styles from "./SlideContent.module.css";

interface BlockAdderProps {
  elementId: string;
  onAdd: (kind: SlideBlockKind) => void;
}

const BlockAdder = ({ elementId, onAdd }: BlockAdderProps) => {
  const [picked, setPicked] = useState<SlideBlockKind>("BodyBlock");
  return (
    <div className={styles.blocksHeaderActions}>
      <Dropdown
        id={`slide-add-block-${elementId}`}
        options={BLOCK_KIND_OPTIONS}
        value={[picked]}
        onChange={(values) => {
          const next = values[0] as SlideBlockKind | undefined;
          if (next) setPicked(next);
        }}
      />
      <Btn size='sm' onClick={() => { onAdd(picked); }}>
        <PlusIcon style={{ width: 14, height: 14 }} />
        Add block
      </Btn>
    </div>
  );
};

export { BlockAdder };
