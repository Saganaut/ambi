// Color scheme customizer for design system exploration.
// Edits --hue-primary and --hue-accent on :root via useTheme so changes
// ripple instantly through every semantic token on the page.
import { useTheme } from "../../hooks/useTheme";
import { Btn } from "@common/Buttons/Btn";
import { ColorPicker } from "@components/Forms/Input/ColorPicker/ColorPicker";
import { themePresets } from "./data";
import styles from "./DesignSystem.module.css";

const ThemePicker = () => {
  const { huePrimary, hueAccent, setHuePrimary, setHueAccent, resetHues } =
    useTheme();

  return (
    <>
      <div className={styles.hueControls}>
        <ColorPicker
          label='Primary'
          value={huePrimary}
          onChange={setHuePrimary}
        />
        <ColorPicker label='Accent' value={hueAccent} onChange={setHueAccent} />
      </div>
      <div className={styles.presetsRow}>
        <span className={styles.presetsLabel}>Presets</span>
        <div className={styles.presetButtons}>
          {themePresets.map((preset) => (
            <Btn
              key={preset.label}
              size='sm'
              onClick={() => {
                if (preset.label === "Brand") {
                  resetHues();
                } else {
                  setHuePrimary(preset.huePrimary);
                  setHueAccent(preset.hueAccent);
                }
              }}>
              <span
                className={styles.presetDot}
                style={{
                  background: `oklch(65% 0.2 ${preset.huePrimary}deg)`,
                }}
              />
              {preset.label}
            </Btn>
          ))}
        </div>
        <Btn size='sm' onClick={resetHues}>
          Reset
        </Btn>
      </div>
    </>
  );
};

export { ThemePicker };
