// The color picker's panel content, usable standalone or inside the
// FloatingPopover wrapper (ColorPicker). Two views, per the DS design
// (Figma 604-3249 / 603-2718):
//
// - "swatches" — a grid of quick-pick swatches (optional clear slash, the
//   provided palette, and a rainbow tile that opens the custom view).
//   Picking a swatch commits immediately and closes.
// - "custom" — free-range editing: saturation/value field, hue + alpha
//   sliders, preview + hex input, Recent/Theme swatch rows that load a
//   color into the editor, and Cancel/Apply. Only Apply commits, so
//   dragging around never half-commits a color.
//
// Values are committed as-given for swatches (a var(--role-*) theme pick
// stays live-themed) and as hex (#rrggbb / #rrggbbaa) from the custom view.
// Hosts whose field can only hold an opaque color pass `allowAlpha={false}`,
// which drops the opacity slider and pins every edit to #rrggbb.
import { ChevronLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import { Btn } from "@ui/Buttons/Btn";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { Input } from "@components/Forms/Input/Input/Input";

import { ColorSlider } from "./ColorSlider";
import { SaturationField } from "./SaturationField";
import { SwatchBtn } from "./SwatchBtn";
import {
  hsvaToHex,
  parseColor,
  type ColorValue,
  type Hsva,
} from "./colorConversion";
import styles from "./ColorPicker.module.css";

type PickerView = "swatches" | "custom";

// Neutral starting point when the incoming value carries no recoverable
// color (unset, or a var(--role-*) reference outside the picker's reach).
const FALLBACK_HSVA: Hsva = { h: 0, s: 0, v: 53, a: 1 };

const WELL_FORMED_HEX_RX = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

interface ColorPickerPanelProps {
  /** The currently selected color — highlights its swatch and seeds the custom view. */
  value?: string;
  /** Quick-select palette swatches (theme roles and/or fixed colors). */
  colorSwatch: ColorValue[];
  /** Recently used colors, newest first. The caller owns persistence. */
  recentlyUsedColorSwatch?: ColorValue[];
  /** Heading of the swatch view, e.g. "Text color". */
  label?: string;
  /** Fired when a color is committed (swatch pick, or Apply in the custom view). */
  onChange: (color: ColorValue) => void;
  /** Fired when a swatch is hovered — for live previews elsewhere. */
  onHover?: (color: ColorValue) => void;
  /** When provided, the swatch grid leads with a clear (slash) swatch. */
  onClear?: () => void;
  /** Close the surrounding popover; also called after a commit. */
  onClose?: () => void;
  /** Which view to open on. Defaults to the swatch grid. */
  initialView?: PickerView;
  /** Whether the custom view offers the opacity slider. Turn off for fields
   *  that can only store an opaque color (the slide/deck background is
   *  validated to #rrggbb); edits are then pinned to full opacity. */
  allowAlpha?: boolean;
  /** Custom-view back control for hosts that reach the custom view from a
   *  menu of their own — renders the header's back chevron. Ignored when the
   *  panel opened on its swatch view (back returns there instead). */
  onBack?: () => void;
  className?: string;
}

const ColorPickerPanel = ({
  value,
  colorSwatch,
  recentlyUsedColorSwatch = [],
  label,
  onChange,
  onHover,
  onClear,
  onClose,
  initialView = "swatches",
  allowAlpha = true,
  onBack,
  className,
}: ColorPickerPanelProps) => {
  // Every color entering the editor passes through here, so an opaque-only
  // host can never end up holding — or emitting — an #rrggbbaa value.
  const withAlphaPolicy = (color: Hsva): Hsva =>
    allowAlpha ? color : { ...color, a: 1 };

  // The custom view's starting point, derived from the incoming value.
  const seed = withAlphaPolicy(
    (value != null ? parseColor(value) : null) ?? FALLBACK_HSVA,
  );

  const [view, setView] = useState<PickerView>(initialView);
  const [hsva, setHsva] = useState<Hsva>(seed);
  // The hex field mirrors the picker but tolerates in-progress typing; only
  // a well-formed 6/8-digit hex is folded back into the picker state.
  const [hexField, setHexField] = useState<string>(() => hsvaToHex(seed));

  const updateColor = (next: Hsva) => {
    const color = withAlphaPolicy(next);
    setHsva(color);
    setHexField(hsvaToHex(color));
  };

  const commit = (color: ColorValue) => {
    onChange(color);
    onClose?.();
  };

  // Load a swatch into the editor. Theme var(--role-*) strings can't be
  // parsed, so fall back to the resolved color the cascade painted on the
  // swatch — which lives on its ::after dot, not the host button.
  const loadSwatch = (color: string, element: HTMLButtonElement) => {
    const parsed =
      parseColor(color) ??
      parseColor(getComputedStyle(element, "::after").backgroundColor);
    if (parsed) updateColor(parsed);
  };

  // Discard in-progress edits: close when the popover owns us; standalone,
  // reset to the seed and return to the swatch grid when one exists.
  const cancelEdit = () => {
    if (onClose) {
      onClose();
      return;
    }
    updateColor(seed);
    if (initialView === "swatches") setView("swatches");
  };

  // The custom header's back target: the internal swatch grid when the panel
  // opened there, else the host's own back navigation (when offered).
  const handleBack =
    initialView === "swatches"
      ? () => {
          setView("swatches");
        }
      : onBack;

  const handleHexInput = (raw: string) => {
    setHexField(raw);
    const normalized = raw.startsWith("#") ? raw : `#${raw}`;
    if (WELL_FORMED_HEX_RX.test(normalized)) {
      const parsed = parseColor(normalized);
      if (parsed) setHsva(withAlphaPolicy(parsed));
    }
  };

  if (view === "swatches") {
    return (
      <div className={[styles.panel, className].filter(Boolean).join(" ")}>
        {label != null && <span className={styles.heading}>{label}</span>}
        <div className={styles.swatchGrid}>
          {onClear && (
            <button
              type='button'
              aria-label='Clear color'
              title='Clear color'
              className={`${styles.swatch} ${styles.swatchClear}`}
              onClick={() => {
                onClear();
                onClose?.();
              }}
            />
          )}
          {colorSwatch.map((color) => (
            <SwatchBtn
              key={color}
              color={color}
              label={color}
              selected={color === value}
              onPick={commit}
              onHover={onHover}
            />
          ))}
          <button
            type='button'
            aria-label='Custom color'
            title='Custom color'
            className={`${styles.swatch} ${styles.swatchRainbow}`}
            onClick={() => {
              setView("custom");
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={[styles.panel, styles.customPanel, className].filter(Boolean).join(" ")}>
      <div className={styles.customHeader}>
        {handleBack ? (
          <button type='button' className={styles.backBtn} onClick={handleBack}>
            <ChevronLeftIcon aria-hidden='true' />
            Custom color
          </button>
        ) : (
          <span className={styles.heading}>Custom color</span>
        )}
        {onClose && (
          <IconBtn
            fill='ghost'
            size='xs'
            icon={<XMarkIcon />}
            aria-label='Close color picker'
            onClick={onClose}
          />
        )}
      </div>

      <SaturationField
        hsva={hsva}
        onChange={(s, v) => {
          updateColor({ ...hsva, s, v });
        }}
      />
      <ColorSlider
        kind='hue'
        hsva={hsva}
        onChange={(h) => {
          updateColor({ ...hsva, h });
        }}
      />
      {allowAlpha && (
        <ColorSlider
          kind='alpha'
          hsva={hsva}
          onChange={(alpha) => {
            updateColor({ ...hsva, a: alpha / 100 });
          }}
        />
      )}

      <div className={styles.valueRow}>
        <span
          className={styles.preview}
          style={{ "--picker-swatch": hsvaToHex(hsva) } as React.CSSProperties}
          aria-hidden='true'
        />
        <Input
          type='text'
          fullWidth
          withPadding={false}
          ariaLabel='Hex color'
          value={hexField}
          onChange={(event) => {
            handleHexInput(event.target.value);
          }}
        />
      </div>

      {recentlyUsedColorSwatch.length > 0 && (
        <div className={styles.swatchSection}>
          <span className={styles.heading}>Recent</span>
          <div className={styles.swatchRow}>
            {recentlyUsedColorSwatch.map((color) => (
              <SwatchBtn
                key={color}
                color={color}
                label={color}
                size='sm'
                onPick={loadSwatch}
                onHover={onHover}
              />
            ))}
          </div>
        </div>
      )}

      {colorSwatch.length > 0 && (
        <div className={styles.swatchSection}>
          <span className={styles.heading}>Theme</span>
          <div className={styles.swatchRow}>
            {colorSwatch.map((color) => (
              <SwatchBtn
                key={color}
                color={color}
                label={color}
                size='sm'
                onPick={loadSwatch}
                onHover={onHover}
              />
            ))}
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <Btn variant='error' size='xs' onClick={cancelEdit}>
          Cancel
        </Btn>
        <Btn
          variant='brand'
          size='xs'
          onClick={() => {
            commit(hsvaToHex(hsva));
          }}>
          Apply
        </Btn>
      </div>
    </div>
  );
};

export { ColorPickerPanel };
export type { ColorPickerPanelProps, PickerView };
export type { ColorString, ColorValue } from "./colorConversion";
