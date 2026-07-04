// AvatarSelector — picks one of the built-in player avatars. Renders a
// fieldset of visually-hidden radio inputs with circular tile labels, so it
// stays keyboard- and screen-reader-friendly while reading visually as a
// tile picker. Follows the Radio/RadioGroup :has() pattern: no JS toggles
// selection state, the input's :checked / :focus-visible / :disabled drives
// everything in CSS.
//
// The roster itself (ids, labels, bundled asset URLs, collections) lives in
// avatarOptions.ts — this component just renders whatever `options` it is
// given. Callers pass a single collection's options at a time (see
// AvatarPicker), so only that collection's images are ever fetched.
//
// Layout: a 3-column grid. By default only the first `maxVisible` tiles
// (default 6 → 2 rows of 3) are shown. When `options.length > maxVisible`,
// a chevron toggle below the grid expands the container into a taller
// scrollable panel that lists every avatar. Tiles lazy-load their image so a
// large, scrolled collection only fetches what comes into view.
import { useId, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import shared from "../Input.module.css";
import styles from "./AvatarSelector.module.css";
import { AVATAR_OPTIONS, type AvatarOption } from "./avatarOptions";
import { IconBtn } from "@ui/Buttons/IconBtn";

interface AvatarSelectorProps {
  name?: string;
  legend?: string;
  value: string;
  onChange: (value: string) => void;
  options?: AvatarOption[];
  maxVisible?: number;
  disabled?: boolean;
  errorMessage?: string;
  infoMessage?: string;
}

const AvatarSelector = ({
  name,
  legend,
  value,
  onChange,
  options = AVATAR_OPTIONS,
  maxVisible = 6,
  disabled,
  errorMessage,
  infoMessage,
}: AvatarSelectorProps) => {
  const generatedName = useId();
  const groupName = name ?? generatedName;
  const panelId = useId();
  const overflows = options.length > maxVisible;
  const [isExpanded, setIsExpanded] = useState(false);

  // When collapsed, ensure the currently-selected tile is in the visible
  // slice so the user can always see what they have picked.
  const collapsedOptions = (() => {
    const head = options.slice(0, maxVisible);
    if (head.some((o) => o.value === value)) return head;
    const selected = options.find((o) => o.value === value);
    if (!selected) return head;
    return [selected, ...head.slice(0, maxVisible - 1)];
  })();
  const visibleOptions = !overflows || isExpanded ? options : collapsedOptions;

  return (
    <fieldset className={styles.container}>
      {legend && <legend className={styles.legend}>{legend}</legend>}
      <div
        id={panelId}
        className={[styles.options, isExpanded ? styles.expanded : ""]
          .filter(Boolean)
          .join(" ")}>
        {visibleOptions.map(({ value: optionValue, label, src }) => {
          const inputId = `${groupName}-${optionValue}`;
          return (
            <div key={optionValue} className={styles.option}>
              <input
                type='radio'
                id={inputId}
                className={styles.input}
                name={groupName}
                value={optionValue}
                checked={value === optionValue}
                disabled={disabled}
                onChange={() => {
                  onChange(optionValue);
                }}
              />
              <label
                htmlFor={inputId}
                className={styles.tile}
                aria-label={label}>
                <img
                  src={src}
                  alt=''
                  className={styles.avatar}
                  loading='lazy'
                  decoding='async'
                />
              </label>
            </div>
          );
        })}
      </div>
      {overflows && (
        <div className={styles.toggleRow}>
          <IconBtn
            fill='ghost'
            size='sm'
            icon={<ChevronDownIcon />}
            className={[styles.toggle, isExpanded ? styles.toggleOpen : ""]
              .filter(Boolean)
              .join(" ")}
            aria-label={isExpanded ? "Show fewer avatars" : "Show all avatars"}
            aria-expanded={isExpanded}
            aria-controls={panelId}
            disabled={disabled}
            onClick={() => {
              setIsExpanded((v) => !v);
            }}
          />
        </div>
      )}
      {(errorMessage != null || infoMessage != null) && (
        <span
          className={[
            shared.inputInfoMessage,
            errorMessage ? shared.errorMessage : "",
          ]
            .filter(Boolean)
            .join(" ")}>
          {errorMessage ?? infoMessage}
        </span>
      )}
    </fieldset>
  );
};

export { AvatarSelector };
// Re-exported for back-compat: existing consumers (avatarUrl.ts, mocks) import
// the roster from here. The canonical home is ./avatarOptions.
export { AVATAR_OPTIONS };
export type { AvatarOption };
