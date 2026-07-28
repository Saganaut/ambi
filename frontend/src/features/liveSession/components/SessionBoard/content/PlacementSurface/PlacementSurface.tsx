// The continuous placement surface shared by the boards that grade a POINT
// rather than a region — the Axis plane and the Place-on-Image backing image. A
// chip dropped here lands wherever the pointer was, so the board needs the
// element twice over: as dnd-kit's droppable, and as the box it measures to turn
// that pointer position into normalized [0, 1] coordinates. Merging those two
// refs onto one div is the whole reason this component exists; the surface's
// contents (image, overlays, placed chips, tap target) come in as children.
//
// Grid's cells are droppables too, but discrete ones — each cell IS the answer,
// no coordinate involved — so they stay Grid's own.
//
// The look stays the caller's, via `className`: the plane is a square panel and
// the image box is an intrinsic-ratio picture, and each arms itself differently
// while an item is held. Only the drop highlight is identical on both, so only
// that lives here.
import { useDroppable } from "@dnd-kit/react";
import type { ReactNode, RefObject } from "react";

import styles from "./PlacementSurface.module.css";

/**
 * Reserved droppable id for the placement surface, shared by every board that
 * uses one (no two are ever mounted together). Item ids are backend-minted
 * UUIDs, cell ids always carry a comma and the bank has its own sentinel, so
 * this comma-free sentinel can collide with none of them.
 */
const SURFACE_DROPPABLE_ID = "surface";

interface PlacementSurfaceProps {
  /** Measured by the board to normalize a drop/tap coordinate over the box. */
  surfaceRef: RefObject<HTMLDivElement | null>;
  /** Disables the drop target outside the answerable moments. */
  dropDisabled: boolean;
  /** The board's own surface chrome, including its held/armed affordance. */
  className?: string;
  children: ReactNode;
}

const PlacementSurface = ({
  surfaceRef,
  dropDisabled,
  className,
  children,
}: PlacementSurfaceProps) => {
  const { ref, isDropTarget } = useDroppable({
    id: SURFACE_DROPPABLE_ID,
    disabled: dropDisabled,
  });
  return (
    <div
      ref={(element) => {
        surfaceRef.current = element;
        ref(element);
      }}
      className={[className, isDropTarget ? styles.dropTarget : ""].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
};

export { PlacementSurface, SURFACE_DROPPABLE_ID };
export type { PlacementSurfaceProps };
