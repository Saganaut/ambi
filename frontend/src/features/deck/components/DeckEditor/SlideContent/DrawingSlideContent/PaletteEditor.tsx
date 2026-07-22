// Live palette editor: a row of clickable swatches plus an "Add" button.
// Each swatch shows the configured color; clicking the trash icon removes
// the entry, clicking the swatch opens the DS color picker for that index.
// Empty palette renders a single dashed "+" tile so authors know what to do.
//
// Swatch picks only offer concrete colors (the default palette as quick picks,
// plus non-theme recents): palette entries feed the player canvas's
// `strokeStyle` and the wire, where a `var(--role-*)` theme ref can't resolve.
import { TrashIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/24/solid";
import type { HTMLProps } from "react";

import { ColorPicker } from "@components/Forms/Input/ColorPicker/ColorPicker";
import type { ColorString, ColorValue } from "@components/Forms/Input/ColorPicker/ColorPicker";
import { addRecentColor, useRecentColors } from "@hooks/useRecentColors";
import { DEFAULT_DRAWING_PALETTE } from "@deck/utils/slideContent";
import styles from "./DrawingSlideContent.module.css";

interface PaletteEditorProps {
  palette: string[];
  /** False hides the add tile (palette at its cap). */
  canAdd?: boolean;
  /** Fired with the full next palette on every edit (pick/add/remove). */
  onCommit: (next: string[]) => void;
}

const DEFAULT_COLOR = "#6019FF";

const isConcreteColor = (color: ColorValue): color is ColorString =>
  !color.startsWith("var(");

const PaletteEditor = ({ palette, canAdd = true, onCommit }: PaletteEditorProps) => {
  const recentColors = useRecentColors().filter(isConcreteColor);

  const handleSwatchPick = (idx: number, color: ColorValue) => {
    onCommit(palette.map((c, i) => (i === idx ? color : c)));
    addRecentColor(color);
  };

  const handleRemove = (idx: number) => {
    onCommit(palette.filter((_, i) => i !== idx));
  };

  const handleAdd = () => {
    onCommit([...palette, DEFAULT_COLOR]);
  };

  return (
    <div className={styles.paletteRow}>
      {palette.map((color, idx) => (
        <div key={`${color}-${idx.toString()}`} className={styles.swatch}>
          <ColorPicker
            value={color}
            colorSwatch={[...DEFAULT_DRAWING_PALETTE]}
            recentlyUsedColorSwatch={recentColors}
            label={`Palette color ${(idx + 1).toString()}`}
            onChange={(next) => {
              handleSwatchPick(idx, next);
            }}
            renderTrigger={(triggerProps) => (
              // triggerProps carries floating-ui's callback ref (typed for a
              // generic HTMLElement); it attaches fine to a button at runtime.
              <button
                {...(triggerProps as HTMLProps<HTMLButtonElement>)}
                type='button'
                className={styles.swatchTile}
                style={{ backgroundColor: color }}
                aria-label={`Palette color ${(idx + 1).toString()}`}
              />
            )}
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
      {canAdd && (
        <button
          type='button'
          className={styles.paletteAdd}
          aria-label='Add color'
          onClick={handleAdd}>
          <PlusIcon />
        </button>
      )}
    </div>
  );
};

export { PaletteEditor };
