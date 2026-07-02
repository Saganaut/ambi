/**
 * Author surface for a non-scorable "content" slide — PowerPoint-style display
 * content with no answer and no scoring. The body is an ordered stack of typed
 * blocks (heading / body text / bullet list / image / callout) the author adds
 * and reorders; each block renders through the shared {@link BlockCard}, which
 * dispatches to its per-kind editor. All block state funnels through the single
 * {@link useTitleEditor} draft + debounce buffer (see that hook).
 */
import { useTitleEditor } from "@deck/hooks/useTitleEditor";
import { SlideContentWrapper } from "../SlideContentWrapper";
import type { SlideContentProps } from "../slideContentProps";
import { BlockAdder } from "../SlideContent/BlockAdder";
import { BlockCard } from "../SlideContent/BlockCard";
import styles from "../SlideContent/SlideContent.module.css";

const TitleSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const { blocks, ready, addBlock, removeBlock, moveBlock, updateBlock, flush } =
    useTitleEditor(deckId, slideId);

  if (!ready) {
    return (
      <SlideContentWrapper title='Content'>
        <p>Select a slide to edit.</p>
      </SlideContentWrapper>
    );
  }

  return (
    <SlideContentWrapper
      title='Content slide'
      description='Add and arrange blocks to build the slide — like a slide deck.'>
      <div className={styles.blocksHeaderActions}>
        <BlockAdder elementId={slideId} onAdd={addBlock} />
      </div>

      {blocks.length === 0 ? (
        <p className={styles.emptyBlocks}>
          No content yet — add a block to get started.
        </p>
      ) : (
        <div className={styles.blockList}>
          {blocks.map((block, index) => (
            <BlockCard
              key={block.id}
              block={block}
              index={index}
              total={blocks.length}
              onRemove={removeBlock}
              onMove={moveBlock}
              onUpdate={updateBlock}
              onFlush={flush}
            />
          ))}
        </div>
      )}
    </SlideContentWrapper>
  );
};

export { TitleSlideContent };
