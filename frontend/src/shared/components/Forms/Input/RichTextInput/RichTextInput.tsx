/**
 * Rich text input — TipTap-backed editable surface that looks like a text
 * input by default. Focusing the editor opens the floating DS toolbar pill
 * (see Toolbar.tsx); it closes on outside press or Escape.
 *
 * The toolbar is a FloatingPopover anchored to the editor surface
 * (`openOn="controlled"`, driven by editor focus) with focus management off,
 * so opening it never pulls the caret out of the editor. Its sub-popovers
 * (color picker, size menu, link editor) nest inside the same popover tree.
 *
 * The `value` / `onChange` API mirrors the rest of the form primitives: HTML
 * string in, HTML string out on every edit. Consumers can persist that string
 * directly to the backend (e.g. Slide.body).
 */
import { PopoverWrapper } from "@saganaut/ambi-ui";
import { EditorContent } from "@tiptap/react";
import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import styles from "./RichTextInput.module.css";
import { Toolbar, type HorizontalAlign, type VerticalAlign } from "./Toolbar";
import { useRichTextEditor } from "./useRichTextInput";

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
  /** Back the input with a frosted contrast plate so its text stays legible over
   *  a background image. Driven by the slide canvas, not passed per-editor. */
  showContrastPlate?: boolean;
  /** Layout/toolbar variant. "input" (default) is the compact input-styled
   *  surface used by prompt and inline fields. "block" fills the available
   *  vertical space and exposes the richer toolbar (lists + alignment) — for
   *  full-slide editing surfaces like the Content slide body. */
  variant?: "input" | "block";
  /** Whole-box alignment of the content within the (block) editor. Both are
   *  controlled: pass the current value and a change handler to opt in — the
   *  alignment controls appear in the toolbar only when the handler is given.
   *  Meaningful only with `variant="block"`. */
  horizontalAlign?: HorizontalAlign;
  verticalAlign?: VerticalAlign;
  onHorizontalAlignChange?: (value: HorizontalAlign) => void;
  onVerticalAlignChange?: (value: VerticalAlign) => void;
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

const RichTextInput = ({
  value,
  onChange,
  onBlur,
  placeholder,
  label,
  id,
  ref,
  isBordered = true,
  showContrastPlate = false,
  variant = "input",
  horizontalAlign = "left",
  verticalAlign = "top",
  onHorizontalAlignChange,
  onVerticalAlignChange,
  className,
  minPx,
  maxPx,
}: RichTextInputProps) => {
  const isBlock = variant === "block";
  const wrapperRef = useRef<HTMLDivElement>(null);
  // The toolbar pill element; useRichTextEditor's blur handler walks up from
  // it to the floating-ui portal node to tell "focus moved into the popup
  // stack" apart from "focus left the editor".
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarOpen, setToolbarOpen] = useState(false);

  const editor = useRichTextEditor({
    value,
    onChange,
    onBlur,
    placeholder,
    id,
    editorClassName: styles.editor,
    wrapperRef,
    popupRef: toolbarRef,
  });

  // Open the toolbar whenever the editor takes focus. Subsequent focus events
  // are a no-op against the already-true state. Closing (outside press,
  // Escape) is handled by the popover's dismiss interaction.
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

  useImperativeHandle(ref, () => ({
    blur: () => {
      editor.commands.blur();
      setToolbarOpen(false);
    },
  }));

  return (
    <div
      className={[styles.wrapper, isBlock && styles.block, className].filter(Boolean).join(" ")}
      ref={wrapperRef}
    >
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <PopoverWrapper
        placement="top-start"
        openOn="controlled"
        manageFocus={false}
        open={toolbarOpen}
        onOpenChange={setToolbarOpen}
        aria-label="Text formatting"
        renderTrigger={(triggerProps) => (
          <div
            {...(triggerProps as React.HTMLProps<HTMLDivElement>)}
            className={[
              styles.surface,
              isBlock && styles.surfaceBlock,
              !isBordered && styles.noBorders,
              showContrastPlate && styles.contrastPlate,
            ]
              .filter(Boolean)
              .join(" ")}
            // Whole-box alignment is applied to the editor via these attributes
            // (see the .surfaceBlock[data-halign|data-valign] rules) rather than
            // living in the content HTML, which stays purely the rich text.
            data-halign={isBlock ? horizontalAlign : undefined}
            data-valign={isBlock ? verticalAlign : undefined}
          >
            <EditorContent editor={editor} className={isBlock ? styles.editorHost : undefined} />
          </div>
        )}
      >
        {({ ctx }) => (
          <div ref={toolbarRef} style={ctx.styles}>
            <Toolbar
              editor={editor}
              showBlockControls={isBlock}
              horizontalAlign={horizontalAlign}
              verticalAlign={verticalAlign}
              onHorizontalAlignChange={onHorizontalAlignChange}
              onVerticalAlignChange={onVerticalAlignChange}
            />
          </div>
        )}
      </PopoverWrapper>
    </div>
  );
};

export { RichTextInput };
export type { HorizontalAlign, RichTextInputHandle, VerticalAlign };
