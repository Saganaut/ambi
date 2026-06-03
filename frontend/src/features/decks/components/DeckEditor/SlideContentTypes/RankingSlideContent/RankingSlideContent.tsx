/**
 * Author surface for a Ranking question.
 *
 * Each item is one `RankingItemEditable` row; the on-screen order becomes
 * the canonical `correctOrder` until drag-to-reorder ships. The
 * `useRankingEditor` hook mirrors `items` into `correctOrder` on every
 * structural commit so the backend stays consistent.
 */
import { useState } from "react";
import { Container } from "@components/Containers/Container";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { useRankingEditor } from "../useElementEditor";
import { EmptySelect, ItemList, PromptField, SectionHeader } from "../_shared";
import { RankingItemEditable } from "./RankingItemEditable";

const RankingSlideContent = () => {
  const {
    question: element,
    schedule,
    flush,
    syncedFromId,
    markSynced,
    items,
    canAdd,
    addItem,
  } = useRankingEditor();

  const [prompt, setPrompt] = useState(element?.prompt ?? "");

  if (element && syncedFromId !== element.id) {
    markSynced(element.id);
    setPrompt(element.prompt ?? "");
  }

  if (!element) return <EmptySelect title='Ranking' />;

  const idBase = element.id ?? "";

  return (
    <Container name='RankingSlideEditor'>
      <SlideContentWrapper>
        <PromptField
          idBase={`rank-${idBase}`}
          value={prompt}
          placeholder='How should the player rank these?'
          onChange={(html) => {
            setPrompt(html);
            schedule({ prompt: html });
          }}
          onBlur={flush}
        />

        <SectionHeader label='Items' hint='top → bottom is the correct order' />

        <ItemList addLabel='Add item' canAdd={canAdd} onAdd={addItem}>
          {items.map((item, idx) =>
            item.id ? (
              <RankingItemEditable
                key={item.id}
                itemId={item.id}
                sortIndex={idx}
              />
            ) : null,
          )}
        </ItemList>
      </SlideContentWrapper>
    </Container>
  );
};

export { RankingSlideContent };
