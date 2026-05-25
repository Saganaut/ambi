// Visual cell-selection overlay for the Grid editor. Renders a row-major
// N×M grid on top of the backing image; clicking a cell toggles whether it
// counts as correct. Single-pick mode replaces the current selection; multi
// mode adds/removes from the set.
//
// Pure presentational + a callback: it doesn't own the selection, the slide
// editor does. That keeps the existing schedule/flush plumbing in charge
// and lets us swap this overlay out later without re-routing state.
import styles from "./GridSlideContent.module.css";

interface GridCellPickerProps {
  rows: number;
  cols: number;
  backingImageUrl: string;
  selected: number[];
  multipleCorrect: boolean;
  onChange: (next: number[]) => void;
}

const GridCellPicker = ({
  rows,
  cols,
  backingImageUrl,
  selected,
  multipleCorrect,
  onChange,
}: GridCellPickerProps) => {
  const safeRows = Math.max(1, rows);
  const safeCols = Math.max(1, cols);
  const cellCount = safeRows * safeCols;
  const selectedSet = new Set(selected);

  const handleToggle = (index: number) => {
    if (!multipleCorrect) {
      onChange(selectedSet.has(index) ? [] : [index]);
      return;
    }
    const next = new Set(selectedSet);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    onChange(Array.from(next).sort((a, b) => a - b));
  };

  return (
    <div
      className={styles.gridOverlay}
      style={{
        gridTemplateColumns: `repeat(${safeCols.toString()}, 1fr)`,
        gridTemplateRows: `repeat(${safeRows.toString()}, 1fr)`,
        backgroundImage: backingImageUrl ? `url(${backingImageUrl})` : undefined,
      }}>
      {Array.from({ length: cellCount }, (_, idx) => {
        const isOn = selectedSet.has(idx);
        return (
          <button
            key={idx}
            type='button'
            className={[styles.gridCell, isOn ? styles.gridCellOn : ""]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={isOn}
            aria-label={`Cell ${(idx + 1).toString()}`}
            onClick={() => { handleToggle(idx); }}>
            <span className={styles.gridCellIndex}>{idx}</span>
          </button>
        );
      })}
    </div>
  );
};

export { GridCellPicker };
