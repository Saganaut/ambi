// Per-kind inspector section for RankingQuestion. The only chunk-10
// ergonomic here is "shuffle items per player for presentation", which the
// interactiveSession service honours when sending the initial round payload.
import { useState } from "react";
import { Toggle } from "@/components/Common/Input/Toggle/Toggle";
import { useElementEditor } from "../../SlideContentTypes/useElementEditor";
import type { RankingQuestion } from "@/store/AmbiApi";
import styles from "../EditSlidePanel.module.css";

const isRankingQuestion = (e: { kind: string }): e is RankingQuestion =>
  e.kind === "RankingQuestion";

const RankingOptionsSection = () => {
  const { element, commit, syncedFromId, markSynced } =
    useElementEditor<RankingQuestion>(isRankingQuestion);

  const [shuffleItemsForPresentation, setShuffleItemsForPresentation] =
    useState<boolean>(element?.shuffleItemsForPresentation ?? true);

  if (element && syncedFromId !== element.id) {
    markSynced(element.id);
    setShuffleItemsForPresentation(element.shuffleItemsForPresentation ?? true);
  }

  if (!element) return null;

  const elId = element.id ?? "";

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Ranking</h4>
      <Toggle
        id={`ranking-shuffle-${elId}`}
        label='Shuffle item order per player'
        checked={shuffleItemsForPresentation}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setShuffleItemsForPresentation(next);
          commit({ ...element, shuffleItemsForPresentation: next });
        }}
      />
    </section>
  );
};

export { RankingOptionsSection };
