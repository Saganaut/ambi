/**
 * Author surface for a non-interactive Slide (title screen / section divider /
 * callout / content / end card). Captures slide kind, title, the block-stacked
 * body content, audio/video media slots, and display seconds.
 *
 * Block stack: the slide body is a list of typed `SlideBlock`s (heading /
 * body / bullet-list / image / callout). Each block lives in its own editor
 * file (`HeadingBlockEditor`, `BodyBlockEditor`, …) and the union dispatcher
 * lives in `BlockCard`. Reorder / remove sit in the BlockCard header.
 *
 * Legacy migration: when the server returns the pre-blocks `body` string and
 * no `blocks`, we surface it as a single BodyBlock so the editor renders
 * consistently. The first commit replaces both fields with the canonical
 * block list.
 */
import { useState } from "react";
import { Input } from "@/components/Common/Input/Input/Input";
import { NumberInput } from "@/components/Common/Input/NumberInput/NumberInput";
import { Dropdown } from "@/components/Common/Input/Dropdown/Dropdown";
import { Container } from "@/components/Containers/Container";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { useSlideEditor } from "../useElementEditor";
import type { Slide } from "@/store/BrainFlexApi";
import type { SlideBlockKind, SlideBlockUnion } from "@/store/slideBlockTypes";
import {
  EmptySelect,
  SectionHeader,
  SettingsCard,
  SettingsRow,
} from "../_shared";
import { BlockAdder } from "./BlockAdder";
import { BlockCard } from "./BlockCard";
import { MediaSlots } from "./MediaSlots";
import { SLIDE_KIND_OPTIONS } from "./types";
import styles from "./SlideContent.module.css";

const SlideContent = () => {
  const {
    question: element,
    blocks,
    schedule,
    flush,
    commit,
    syncedFromId,
    markSynced,
    addBlock,
    removeBlock,
    moveBlock,
    updateBlock,
  } = useSlideEditor();

  const [title, setTitle] = useState<string>(element?.chrome?.title ?? "");
  const [displaySeconds, setDisplaySeconds] = useState<number>(
    element?.chrome?.displaySeconds ?? 0,
  );
  const [slideKind, setSlideKind] = useState<Slide["slideKind"]>(
    element?.slideKind ?? "CONTENT",
  );

  if (element && syncedFromId !== element.id) {
    markSynced(element.id);
    setTitle(element.chrome?.title ?? "");
    setDisplaySeconds(element.chrome?.displaySeconds ?? 0);
    setSlideKind(element.slideKind ?? "CONTENT");
  }

  if (!element) return <EmptySelect title='Slide' />;

  const idBase = element.id ?? "";

  const handleAddBlock = (kind: SlideBlockKind) => {
    addBlock(kind);
  };

  const handleRemoveBlock = (id: string) => {
    removeBlock(id);
  };

  const handleMoveBlock = (id: string, direction: -1 | 1) => {
    moveBlock(id, direction);
  };

  const handleUpdateBlock = (
    next: SlideBlockUnion,
    mode: "schedule" | "commit",
  ) => {
    updateBlock(next, mode);
  };

  const kindBadge = (
    <span className={styles.kindBadge}>{slideKind ?? "CONTENT"}</span>
  );

  return (
    <Container name='SlideEditor'>
      <SlideContentWrapper>
        <SettingsCard title='Slide' action={kindBadge}>
          <SettingsRow>
            <Dropdown
              label='Kind'
              id={`slide-kind-${idBase}`}
              options={SLIDE_KIND_OPTIONS}
              value={slideKind ? [slideKind] : []}
              onChange={(values) => {
                const next = (values[0] ?? "CONTENT") as Slide["slideKind"];
                setSlideKind(next);
                commit({ slideKind: next });
              }}
            />
            <Input
              label='Title'
              id={`slide-title-${idBase}`}
              type='text'
              value={title}
              placeholder='Slide title…'
              onChange={(e) => {
                const next = e.target.value;
                setTitle(next);
                schedule({ chrome: { ...element.chrome, title: next } });
              }}
              onBlur={flush}
            />
            <NumberInput
              label='Display seconds (0 = manual)'
              id={`slide-display-seconds-${idBase}`}
              min={0}
              value={displaySeconds}
              onChange={(next) => {
                setDisplaySeconds(next);
                schedule({ chrome: { ...element.chrome, displaySeconds: next } });
              }}
              onBlur={flush}
            />
          </SettingsRow>
        </SettingsCard>

        <SectionHeader
          label='Content blocks'
          action={<BlockAdder elementId={idBase} onAdd={handleAddBlock} />}
        />

        {blocks.length === 0 ? (
          <p className={styles.emptyBlocks}>
            No content yet. Add a heading, body text, bullet list, image, or
            callout.
          </p>
        ) : (
          <div className={styles.blockList}>
            {blocks.map((block, idx) => (
              <BlockCard
                key={block.id}
                block={block}
                index={idx}
                total={blocks.length}
                onRemove={handleRemoveBlock}
                onMove={handleMoveBlock}
                onUpdate={handleUpdateBlock}
                onFlush={flush}
              />
            ))}
          </div>
        )}

        <SettingsCard title='Media'>
          <MediaSlots
            element={element}
            onCommit={(patch) => {
              commit({ chrome: { ...element.chrome, ...patch } });
            }}
            onFlush={flush}
          />
        </SettingsCard>
      </SlideContentWrapper>
    </Container>
  );
};

export { SlideContent };
