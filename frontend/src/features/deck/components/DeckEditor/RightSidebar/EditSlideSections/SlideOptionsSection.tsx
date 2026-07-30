// Options section for non-interactive slide types (TITLE, CONTENT, MEDIA,
// INSTRUCTION) — FOLLOW_UP routes to FollowUpOptionsSection instead.
// TODO: The old Slide element carried resultsDisplayType, multipleSelectionsEnabled,
// showResultsAsPercentage, showJoinInformation, showQrCode, heading,
// participantInformation, autoAdvanceSeconds, and showResponses. None of these
// fields exist on the new TitleContent / MediaContent / FollowUpContent types.
// Wire these controls once the new slide model supports them.
import styles from "@deck/components/DeckEditor/RightSidebar/EditSlidePanel/EditSlidePanel.module.css";

const SlideOptionsSection = () => (
  <section className={styles.section}>
    <h4 className={styles.heading}>Slide options</h4>
    <p className={styles.empty}>
      No additional options for this slide type.
    </p>
  </section>
);

export { SlideOptionsSection };
