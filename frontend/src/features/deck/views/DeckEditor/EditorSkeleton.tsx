/**
 * Placeholder shell shown while the deck editor's first reads (deck + slides)
 * are in flight. Mirrors the real three-column footprint — slide rail | canvas |
 * inspector — so the layout doesn't jump when {@link DeckEditor} swaps in. Cold
 * navigation (URL/refresh) has no hover to prefetch on, so this is what stands
 * between the click and a blank screen.
 */
import { Dashboard } from "@/shared/components/Layout/Dashboard/Dashboard";
import { Loader } from "@ui/Loader/Loader";
import { Skeleton } from "@ui/Skeleton/Skeleton";

import styles from "./EditorSkeleton.module.css";

const RAIL_THUMBNAILS = 5;

const EditorSkeleton = () => {
  return (
    <Dashboard className={styles.editorSkeleton}>
      <Dashboard.Body>
        <aside className={styles.rail} aria-hidden="true">
          {Array.from({ length: RAIL_THUMBNAILS }).map((_, i) => (
            <Skeleton
              // Identical placeholder thumbnails; index is the stable identity.
              // eslint-disable-next-line react-x/no-array-index-key
              key={i}
              variant="rect"
              width="100%"
              height="4rem"
            />
          ))}
        </aside>

        <Dashboard.Canvas className={styles.canvas}>
          <Loader message="Loading deck…" />
        </Dashboard.Canvas>

        <aside className={styles.inspector} aria-hidden="true">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="rect" width="100%" height="8rem" />
          <Skeleton variant="text" count={3} />
        </aside>
      </Dashboard.Body>
    </Dashboard>
  );
};

export { EditorSkeleton };
