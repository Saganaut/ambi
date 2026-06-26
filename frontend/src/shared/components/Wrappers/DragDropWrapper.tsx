import { DragEndEvent } from "@dnd-kit/dom";
import { DragDropProvider } from "@dnd-kit/react";
import { ReactNode } from "react";

/** Allows a component to conditionally load the drag and drop
 * provider if a on Reorder (on dragend) callback is not provided **/
const DragDropWrapper = ({
  onReorder,
  children,
}: {
  onReorder?: (event: DragEndEvent) => void;
  children: ReactNode;
}) =>
  onReorder ? (
    <DragDropProvider onDragEnd={onReorder}>{children}</DragDropProvider>
  ) : (
    <>{children}</>
  );

export { DragDropWrapper };
