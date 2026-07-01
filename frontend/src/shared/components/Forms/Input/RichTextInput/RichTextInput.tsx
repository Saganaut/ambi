/**
 * Rich text input — TipTap-backed editable surface that looks like a text
 * input by default. Clicking inside opens a floating toolbar (bold / strike /
 * underline / link / color / font-size). The toolbar closes on outside
 * pointerdown or Escape — same pattern the rest of the app's popovers use
 * (see McqOptionEditable).
 *
 * Positioning uses CSS Anchor Positioning (`anchor-name` on the surface,
 * `position-anchor` + `anchor()` on the toolbar) so the toolbar sits above
 * the input regardless of where the input lives in the page flow. No portal,
 * no floating-ui — the toolbar is a DOM sibling of the editor inside the
 * wrapper.
 *
 * Toolbar buttons use `preventFocusSteal` so clicking them doesn't blur the
 * ProseMirror editor; the link <input> is a real focusable element, so the
 * blur handler in useRichTextEditor ignores focus moves that land inside the
 * wrapper.
 *
 * The `value` / `onChange` API mirrors the rest of the form primitives: HTML
 * string in, HTML string out on every edit. Consumers can persist that string
 * directly to the backend (e.g. Slide.body).
 */
import { EditorContent, type Editor } from "@tiptap/react";
import {
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useClickOutside } from "@/shared/hooks/useClickOutside";
import styles from "./RichTextInput.module.css";
import {
  Popover,
  PopoverRow,
  PopoverButton,
  PopoverDivider,
  PopoverGroupLabel,
} from "../Popover/Popover";
import { useRichTextEditor, useLinkEditor } from "./useRichTextInput";
import { ColorOptionBtn } from "@ui/Buttons/ColorOptionBtn";
import { ThemeColorSwatches } from "../ColorPicker/ThemeColorSwatches";

interface RichTextInputHandle {
  /** Blur the underlying editor and close the toolbar. Used by parents that
   *  need to dismiss the floating toolbar without waiting for the user to
   *  click outside (e.g. a collapsing drawer). */
  blur: () => void;
}

interface RichTextInputProps {
  value: string;
  onChange: (html: string) => void;
  /** Fired when focus leaves the editor (and the toolbar). Useful for
   *  flushing a debounced commit. */
  onBlur?: () => void;
  placeholder?: string;
  label?: string;
  id?: string;
  ref?: React.Ref<RichTextInputHandle>;
  isBordered?: boolean;
  showGradient?: boolean;
  className?: string;
  /** Auto-shrink the editor's font-size so its content fits inside its
   *  bounded box — same algorithm as `useFitText` (the shared hook can't
   *  bind to TipTap's contenteditable because the DOM is owned by the
   *  editor view, not React). Pass both bounds to opt in; below `minPx`
   *  the content clips. Only meaningful when the host constrains the
   *  editor's height (e.g. inside a fixed-height card). */
  minPx?: number;
  maxPx?: number;
}

// The full basic-color set, shown in the "More colors" panel.
const COLOR_CHOICES: { label: string; value: string }[] = [
  { label: "Default", value: "" },
  { label: "Black", value: "#000000" },
  { label: "White", value: "#ffffff" },
  { label: "Red", value: "#e53e3e" },
  { label: "Orange", value: "#dd6b20" },
  { label: "Green", value: "#38a169" },
  { label: "Blue", value: "#3182ce" },
  { label: "Purple", value: "#805ad5" },
];

// The compact set always shown inline in the toolbar — black + white are always
// here per design, plus default (clear) and three common colors. The rest live
// behind the "More colors" button.
const QUICK_COLOR_CHOICES: { label: string; value: string }[] = [
  { label: "Default", value: "" },
  { label: "Black", value: "#000000" },
  { label: "White", value: "#ffffff" },
  { label: "Red", value: "#e53e3e" },
  { label: "Green", value: "#38a169" },
  { label: "Blue", value: "#3182ce" },
];

// Swatch for the "More colors" toggle — a rainbow so it reads as "open the
// palette", not a single color.
const MORE_COLORS_SWATCH =
  "conic-gradient(from 90deg, #e53e3e, #dd6b20, #38a169, #3182ce, #805ad5, #e53e3e)";

const SIZE_CHOICES: { label: string; value: string }[] = [
  { label: "S", value: "0.875rem" },
  { label: "M", value: "1rem" },
  { label: "L", value: "1.25rem" },
  { label: "XL", value: "1.75rem" },
];

interface ToolbarProps {
  editor: Editor;
  linkOpen: boolean;
  setLinkOpen: (v: boolean) => void;
}

const Toolbar = ({ editor, linkOpen, setLinkOpen }: ToolbarProps) => {
  const {
    linkUrl,
    setLinkUrl,
    linkInputRef,
    applyLink,
    removeLink,
    toggleLinkEditor,
  } = useLinkEditor({ editor, linkOpen, setLinkOpen });

  // "More colors" sub-panel. Mutually exclusive with the link editor so the two
  // don't stack below the toolbar.
  const [colorMenuOpen, setColorMenuOpen] = useState(false);

  const applyColor = (value: string) => {
    if (value === "") editor.chain().focus().unsetColor().run();
    else editor.chain().focus().setColor(value).run();
  };

  return (
    <>
      <Popover role='toolbar' ariaLabel='Text formatting'>
        <PopoverRow>
          <PopoverButton
            ariaLabel='Bold'
            isActive={editor.isActive("bold")}
            preventFocusSteal
            onClick={() => editor.chain().focus().toggleBold().run()}>
            <strong>B</strong>
          </PopoverButton>
          <PopoverButton
            ariaLabel='Underline'
            isActive={editor.isActive("underline")}
            preventFocusSteal
            onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <u>U</u>
          </PopoverButton>
          <PopoverButton
            ariaLabel='Strikethrough'
            isActive={editor.isActive("strike")}
            preventFocusSteal
            onClick={() => editor.chain().focus().toggleStrike().run()}>
            <s>S</s>
          </PopoverButton>
          <PopoverButton
            ariaLabel={linkOpen ? "Close link editor" : "Insert link"}
            isActive={editor.isActive("link") || linkOpen}
            preventFocusSteal
            onClick={() => {
              setColorMenuOpen(false);
              toggleLinkEditor();
            }}>
            <span aria-hidden='true'>🔗</span>
          </PopoverButton>

          <PopoverDivider />

          {/* Compact inline color set; the rest (+ theme colors) live behind
              the "More colors" button. */}
          {QUICK_COLOR_CHOICES.map((color) => (
            <ColorOptionBtn
              key={color.label}
              label={color.label}
              color={color.value}
              preventFocusSteal
              onClick={() => {
                applyColor(color.value);
              }}
            />
          ))}
          <ColorOptionBtn
            label='More colors'
            ariaLabel={colorMenuOpen ? "Close color menu" : "More colors"}
            color={MORE_COLORS_SWATCH}
            preventFocusSteal
            onClick={() => {
              setLinkOpen(false);
              setColorMenuOpen((o) => !o);
            }}
          />

          <PopoverDivider />

          {SIZE_CHOICES.map((size) => (
            <PopoverButton
              key={size.label}
              ariaLabel={`Set font size ${size.label}`}
              isActive={editor.isActive("textStyle", { fontSize: size.value })}
              preventFocusSteal
              onClick={() =>
                editor.chain().focus().setFontSize(size.value).run()
              }>
              {size.label}
            </PopoverButton>
          ))}
        </PopoverRow>
      </Popover>

      {colorMenuOpen && (
        <Popover
          className={styles.colorPopover}
          role='dialog'
          ariaLabel='More colors'>
          <PopoverGroupLabel>Basic</PopoverGroupLabel>
          <PopoverRow>
            {COLOR_CHOICES.map((color) => (
              <ColorOptionBtn
                key={color.label}
                label={color.label}
                color={color.value}
                preventFocusSteal
                onClick={() => {
                  applyColor(color.value);
                  setColorMenuOpen(false);
                }}
              />
            ))}
          </PopoverRow>
          <PopoverDivider />
          <PopoverGroupLabel>Theme</PopoverGroupLabel>
          <PopoverRow>
            {/* Active theme's palette colors — stored as live var(--role-*)
                refs so the text tracks the deck/global theme. */}
            <ThemeColorSwatches
              preventFocusSteal
              onPick={(value) => {
                applyColor(value);
                setColorMenuOpen(false);
              }}
            />
          </PopoverRow>
        </Popover>
      )}

      {linkOpen && (
        <Popover
          className={styles.linkPopover}
          role='dialog'
          ariaLabel='Edit link'>
          <PopoverRow>
            <input
              ref={linkInputRef}
              type='url'
              aria-label='Link URL'
              className={styles.linkInput}
              placeholder='https://example.com'
              value={linkUrl}
              onChange={(e) => {
                setLinkUrl(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setLinkOpen(false);
                }
              }}
            />
            <button
              type='button'
              className={styles.linkApply}
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={applyLink}>
              Apply
            </button>
            {editor.isActive("link") && (
              <button
                type='button'
                className={styles.linkRemove}
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onClick={removeLink}>
                Remove
              </button>
            )}
          </PopoverRow>
        </Popover>
      )}
    </>
  );
};

const RichTextInput = ({
  value,
  onChange,
  onBlur,
  placeholder,
  label,
  id,
  ref,
  isBordered = true,
  showGradient = false,
  className,
  minPx,
  maxPx,
}: RichTextInputProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  // Per-instance CSS anchor name. The floating toolbar uses CSS Anchor
  // Positioning to sit above the editor surface, but `anchor-name` is a
  // single shared identifier — every RichTextInput on the page declaring
  // the same `--rte` name collapses to one anchor, so every toolbar
  // positions against whichever surface wins, and toggling one editor
  // shifts another's toolbar. `useId` gives each instance its own name.
  // `useId` returns identifiers like `:r0:`; strip the colons since they
  // aren't valid in CSS custom-property names.
  const anchorName = `--rte-${useId().replace(/:/g, "")}`;

  const editor = useRichTextEditor({
    value,
    onChange,
    onBlur,
    placeholder,
    id,
    editorClassName: styles.editor,
    wrapperRef,
  });

  // Open the toolbar whenever the editor takes focus. Subsequent focus events
  // are a no-op against the already-true state.
  useEffect(() => {
    const handleFocus = () => {
      setToolbarOpen(true);
    };
    editor.on("focus", handleFocus);
    return () => {
      editor.off("focus", handleFocus);
    };
  }, [editor]);

  // Auto-fit font-size so the editor's content stays within ~one line at
  // `maxPx`. Same intent as `useFitText`, but TipTap's contenteditable has
  // no intrinsic height cap — it grows with its content — so we can't
  // compare `scrollHeight > clientHeight` (they're always equal). Instead
  // we compute a target height (one `maxPx` line + the element's own
  // padding) and shrink the font until `scrollHeight` fits the target.
  //
  // Crucially this avoids touching min-height / max-height / overflow on
  // the element. Capping those collapses the empty editor (the placeholder
  // has `height: 0`, so the box has nothing else holding it open) and the
  // small/clipped click target breaks the focus → floating-toolbar flow.
  useLayoutEffect(() => {
    if (minPx == null || maxPx == null) return;
    // Same StrictMode race as the content-sync effect in useRichTextInput: a
    // destroyed editor's `view` getter returns a Proxy that throws on any
    // property access, so `editor.view.dom` below would crash. Bail explicitly
    // rather than relying on layout-effect cleanup timing to shield us.
    if (editor.isDestroyed) return;
    const el: HTMLElement = editor.view.dom;
    const stepPx = 0.5;
    const setStyle = (prop: string, value: string) => {
      el.style.setProperty(prop, value);
    };
    const fit = () => {
      let size = maxPx;
      setStyle("font-size", `${size.toString()}px`);
      const cs = window.getComputedStyle(el);
      const padding = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const target = maxPx * 1.5 + padding;
      while (el.scrollHeight > target && size > minPx) {
        size -= stepPx;
        setStyle("font-size", `${size.toString()}px`);
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    editor.on("update", fit);
    return () => {
      ro.disconnect();
      editor.off("update", fit);
      setStyle("font-size", "");
    };
  }, [editor, value, minPx, maxPx]);

  useClickOutside(wrapperRef, () => { setToolbarOpen(false); setLinkOpen(false); }, toolbarOpen);

  useEffect(() => {
    if (!toolbarOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setToolbarOpen(false);
        setLinkOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [toolbarOpen]);

  useImperativeHandle(ref, () => ({
    blur: () => {
      editor.commands.blur();
      setLinkOpen(false);
      setToolbarOpen(false);
    },
  }));

  return (
    <div
      className={[styles.wrapper, className].filter(Boolean).join(" ")}
      ref={wrapperRef}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <div
        className={[
          styles.surface,
          !isBordered && styles.noBorders,
          showGradient && styles.withGradient,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ anchorName }}>
        {toolbarOpen && (
          <div
            className={styles.floatingToolbar}
            style={{ positionAnchor: anchorName }}>
            <Toolbar
              editor={editor}
              linkOpen={linkOpen}
              setLinkOpen={setLinkOpen}
            />
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export { RichTextInput };
export type { RichTextInputHandle };
