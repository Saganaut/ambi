/**
 * Placeholder shell shown while the deck editor's first reads (deck + slides)
 * are in flight. Mirrors the real three-column footprint — slide rail | canvas |
 * inspector — so the layout doesn't jump when {@link DeckEditor} swaps in. Cold
 * navigation (URL/refresh) has no hover to prefetch on, so this is what stands
 * between the click and a blank screen.
 */
import { CanvasBody } from "@/shared/components/Layout/CanvasBody";
import { InnerDisplay } from "@/shared/components/Layout/InnerDisplay";
import { MainBodyDashboard } from "@/shared/components/Layout/MainBodyDashboard";
import { Loader } from "@ui/Loader/Loader";
import { Skeleton } from "@ui/Skeleton/Skeleton";

import styles from "./EditorSkeleton.module.css";

const RAIL_THUMBNAILS = 5;

const EditorSkeleton = () => {
  return (
    <MainBodyDashboard className={styles.editorSkeleton}>
      <CanvasBody>
        <aside className={styles.rail} aria-hidden='true'>
          {Array.from({ length: RAIL_THUMBNAILS }).map((_, i) => (
            <Skeleton
              // Identical placeholder thumbnails; index is the stable identity.
              // eslint-disable-next-line react-x/no-array-index-key
              key={i}
              variant='rect'
              width='100%'
              height='4rem'
            />
          ))}
        </aside>

        <InnerDisplay className={styles.canvas}>
          <Loader message='Loading deck…' />
        </InnerDisplay>

        <aside className={styles.inspector} aria-hidden='true'>
          <Skeleton variant='text' width='60%' />
          <Skeleton variant='rect' width='100%' height='8rem' />
          <Skeleton variant='text' count={3} />
        </aside>
      </CanvasBody>
    </MainBodyDashboard>
  );
};

export { EditorSkeleton };
