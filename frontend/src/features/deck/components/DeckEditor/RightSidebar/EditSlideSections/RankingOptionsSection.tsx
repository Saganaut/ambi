// Per-kind inspector section for RANKING slides.
// TODO: The old model had `shuffleItemsForPresentation` which no longer exists
// in RankingContent. Wire display options once the new slide model supports them.
import styles from "@deck/components/DeckEditor/RightSidebar/EditSlidePanel/EditSlidePanel.module.css";

const RankingOptionsSection = () => (
  <section className={styles.section}>
    <h4 className={styles.heading}>Ranking</h4>
    <p className={styles.empty}>
      Ranking items are edited in the slide editor.
    </p>
  </section>
);

export { RankingOptionsSection };
