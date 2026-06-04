// Audio + video media-picker slots used at the bottom of the slide editor.
//
// TODO(migration): stubbed pending slide-block migration. This component was
// built entirely on `@hooks/useMediaPicker`, which no longer exists. The body
// is replaced with a placeholder so the file compiles; the props shape is
// preserved so `SlideContent.tsx` still type-checks against it.
import styles from "./SlideContent.module.css";

/** Narrow patch shape — MediaSlots only ever touches the audio/video chrome
 *  fields. The parent commits this nested under `chrome:` on the element. */

const MediaSlots = () => {
  return <div className={styles.mediaRow}>Media editor — coming soon</div>;
};

export { MediaSlots };
