// Live palette editor: a row of clickable swatches plus an "Add" button.
// Each swatch shows the configured color; clicking the trash icon removes
// the entry, clicking the swatch opens a native color picker for that index.
// Empty palette renders a single dashed "+" tile so authors know what to do.
import { TrashIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/24/solid";
import styles from "./DrawingSlideContent.module.css";

interface PaletteEditorProps {
  palette: string[];
  onChange: (next: string[]) => void;
  onCommit?: (next: string[]) => void;
}

const DEFAULT_COLOR = "#6019FF";

const PaletteEditor = ({ palette, onChange, onCommit }: PaletteEditorProps) => {
  const handleSwatchChange = (idx: number, color: string) => {
    const next = palette.map((c, i) => (i === idx ? color : c));
    onChange(next);
  };

  const handleSwatchCommit = (idx: number, color: string) => {
    const next = palette.map((c, i) => (i === idx ? color : c));
    onCommit?.(next);
  };

  const handleRemove = (idx: number) => {
    const next = palette.filter((_, i) => i !== idx);
    onCommit?.(next);
  };

  const handleAdd = () => {
    const next = [...palette, DEFAULT_COLOR];
    onCommit?.(next);
  };

  return (
    <div className={styles.paletteRow}>
      {palette.map((color, idx) => (
        <div key={`${color}-${idx.toString()}`} className={styles.swatch}>
          <input
            type='color'
            className={styles.swatchInput}
            value={color}
            aria-label={`Palette color ${(idx + 1).toString()}`}
            onChange={(e) => { handleSwatchChange(idx, e.target.value); }}
            onBlur={(e) => { handleSwatchCommit(idx, e.target.value); }}
          />
          <div
            className={styles.swatchTile}
            style={{ backgroundColor: color }}
            aria-hidden='true'
          />
          <button
            type='button'
            className={styles.swatchRemove}
            aria-label={`Remove color ${(idx + 1).toString()}`}
            onClick={() => { handleRemove(idx); }}>
            <TrashIcon />
          </button>
        </div>
      ))}
      <button
        type='button'
        className={styles.paletteAdd}
        aria-label='Add color'
        onClick={handleAdd}>
        <PlusIcon />
      </button>
    </div>
  );
};

export { PaletteEditor };
