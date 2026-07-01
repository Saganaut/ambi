// Left-rail round tracker. The Gen-2 read model exposes only the current slide
// (not the full deck's slide list), so the per-round thumbnail strip has no data
// to render and is intentionally inert until a future chunk surfaces the round
// list on the snapshot. Kept mounted so the page layout is unchanged.
import styles from "./SessionRoundTracker.module.css";

const SessionRoundTracker = () => <div className={styles.sessionRoundTracker} />;

export { SessionRoundTracker };
