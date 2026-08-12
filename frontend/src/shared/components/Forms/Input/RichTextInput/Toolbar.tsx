/**
 * Floating formatting toolbar for RichTextInput — the DS pill (Figma 604-3216):
 * bold / underline / strike / link, a color trigger opening the DS color
 * picker, and a size trigger opening the size menu. The block variant appends
 * list and whole-box alignment controls.
 *
 * Every sub-popover (color picker, size menu, link editor) is a FloatingPopover
 * nested inside the toolbar's own FloatingPopover; the shared FloatingTree in
 * PopoverWrapper keeps an inside-press on a nested panel from dismissing the
 * toolbar. All of them run with `manageFocus` off and focus-stealing prevented
 * on their triggers, so the caret (and selection) stays in the editor while
 * the user formats.
 */
import { ChevronDownIcon, LinkIcon } from "@heroicons/react/24/outline";
import { useEditorState, type Editor } from "@tiptap/react";
import { useState, type HTMLProps, type MouseEvent, type ReactNode } from "react";

import { Input } from "@components/Forms/Input/Input/Input";
import { addRecentColor, useRecentColors } from "@hooks/useRecentColors";
import { Btn, PopoverWrapper } from "@saganaut/ambi-ui";
import { THEME_COLOR_ROLES } from "@utils/roleColors";
import { ColorPicker, type ColorValue } from "../ColorPicker/ColorPicker";
import styles from "./RichTextInput.module.css";
import { useLinkEditor } from "./useRichTextInput";

/** Whole-box alignment of the content within the editor. Semantic (not backend)
 *  values — the consumer maps these to whatever it persists. */
type HorizontalAlign = "left" | "center" | "right";
type VerticalAlign = "top" | "middle" | "bottom";

// Sub-popovers are mutually exclusive so they never stack under the toolbar.
type SubMenu = "color" | "size" | "link" | null;

// The applied sizes are unchanged from the previous toolbar (14 / 20 / 30 /
// 44 px) so persisted content round-trips; the menu previews render "Aa" on
// the DS type scale per the Figma size menu.
const SIZE_CHOICES: {
  letter: string;
  label: string;
  value: string;
  previewClass: string;
}[] = [
  { letter: "S", label: "Small", value: "0.875rem", previewClass: styles.sizePreviewS },
  { letter: "M", label: "Medium", value: "1.25rem", previewClass: styles.sizePreviewM },
  { letter: "L", label: "Large", value: "1.875rem", previewClass: styles.sizePreviewL },
  { letter: "XL", label: "Extra large", value: "2.75rem", previewClass: styles.sizePreviewXl },
];

// Swatch-grid palette: fixed black + white per design, then the curated theme
// roles — live var(--role-*) refs, so picked text tracks the active theme.
const COLOR_SWATCHES: ColorValue[] = [
  "#000000",
  "#ffffff",
  ...THEME_COLOR_ROLES.map((r) => r.cssVar as ColorValue),
];

const H_ALIGNS: { value: HorizontalAlign; label: string }[] = [
  { value: "left", label: "Align left" },
  { value: "center", label: "Align center" },
  { value: "right", label: "Align right" },
];
const V_ALIGNS: { value: VerticalAlign; label: string }[] = [
  { value: "top", label: "Align top" },
  { value: "middle", label: "Align middle" },
  { value: "bottom", label: "Align bottom" },
];

// Inline align glyph — the toolbar is text/glyph based and Heroicons has no
// alignment set. Horizontal draws ragged "text" lines anchored left/center/right
// (index 0/1/2); vertical draws full-width lines grouped at top/middle/bottom.
const ALIGN_LINE_WIDTHS = [10, 7, 9, 6];
const AlignGlyph = ({ axis, index }: { axis: "h" | "v"; index: 0 | 1 | 2 }) => {
  const lines = ALIGN_LINE_WIDTHS.map((width, lineIndex) => {
    if (axis === "h") {
      const y = 3.5 + lineIndex * 3;
      const x1 = index === 0 ? 3 : index === 2 ? 13 - width : 8 - width / 2;
      return { x1, y, x2: x1 + width };
    }
    const yOffset = index === 0 ? 0 : index === 2 ? 4.5 : 2.25;
    const y = 3 + yOffset + lineIndex * 2;
    return { x1: 3, y, x2: 13 };
  });
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {lines.map((line) => (
        <line key={`${line.y}-${line.x1}`} x1={line.x1} y1={line.y} x2={line.x2} y2={line.y} />
      ))}
    </svg>
  );
};

// Swallow mousedown so the ProseMirror editor keeps focus and selection while
// the toolbar is clicked.
const preventFocusSteal = (e: MouseEvent) => {
  e.preventDefault();
};

interface ToolbarBtnProps {
  ariaLabel: string;
  isActive?: boolean;
  onClick: () => void;
  children: ReactNode;
}

const ToolbarBtn = ({ ariaLabel, isActive, onClick, children }: ToolbarBtnProps) => (
  <button
    type="button"
    aria-label={ariaLabel}
    aria-pressed={isActive}
    className={styles.toolbarBtn}
    onMouseDown={preventFocusSteal}
    onClick={onClick}
  >
    {children}
  </button>
);

const ToolbarDivider = () => <div className={styles.divider} aria-hidden="true" />;

interface ToolbarProps {
  editor: Editor;
  /** Show the richer block controls (lists + alignment). Off for the compact
   *  input variant used by prompt/inline fields. */
  showBlockControls: boolean;
  /** Whole-box alignment state + setters. Present only when the consumer opts
   *  into alignment (the block/content usage); absent hides the align controls. */
  horizontalAlign?: HorizontalAlign;
  verticalAlign?: VerticalAlign;
  onHorizontalAlignChange?: (value: HorizontalAlign) => void;
  onVerticalAlignChange?: (value: VerticalAlign) => void;
}

const Toolbar = ({
  editor,
  showBlockControls,
  horizontalAlign = "left",
  verticalAlign = "top",
  onHorizontalAlignChange,
  onVerticalAlignChange,
}: ToolbarProps) => {
  const [openMenu, setOpenMenu] = useState<SubMenu>(null);
  // App-wide recents (persisted) — feeds the color picker's Recent row.
  const recent = useRecentColors();

  const linkOpen = openMenu === "link";
  const { linkUrl, setLinkUrl, linkInputRef, applyLink, removeLink, openLinkEditor } =
    useLinkEditor({
      editor,
      linkOpen,
      setLinkOpen: (open) => {
        setOpenMenu(open ? "link" : null);
      },
    });

  // TipTap v3's useEditor doesn't re-render on transactions; subscribe to the
  // marks the toolbar displays so active states (and the color dot / size
  // letter) track the caret live.
  const marks = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      link: e.isActive("link"),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      color: (e.getAttributes("textStyle").color as string | undefined) ?? "",
      fontSize: (e.getAttributes("textStyle").fontSize as string | undefined) ?? "",
    }),
  });
  const currentColor = marks.color;
  const activeSize = SIZE_CHOICES.find((size) => size.value === marks.fontSize);

  const applyColor = (color: ColorValue) => {
    editor.chain().focus().setColor(color).run();
    addRecentColor(color);
  };

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Text formatting">
      <ToolbarBtn
        ariaLabel="Bold"
        isActive={marks.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </ToolbarBtn>
      <ToolbarBtn
        ariaLabel="Underline"
        isActive={marks.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <u>U</u>
      </ToolbarBtn>
      <ToolbarBtn
        ariaLabel="Strikethrough"
        isActive={marks.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <s>S</s>
      </ToolbarBtn>

      <PopoverWrapper
        open={linkOpen}
        onOpenChange={(open) => {
          if (open) openLinkEditor();
          else setOpenMenu(null);
        }}
        manageFocus={false}
        showArrow
        arrowClassName={styles.tail}
        offsetAmount={12}
        aria-label="Edit link"
        renderTrigger={(triggerProps) => (
          <button
            {...(triggerProps as HTMLProps<HTMLButtonElement>)}
            type="button"
            aria-label={linkOpen ? "Close link editor" : "Insert link"}
            aria-pressed={marks.link || linkOpen}
            className={styles.toolbarBtn}
            onMouseDown={preventFocusSteal}
          >
            <LinkIcon aria-hidden="true" />
          </button>
        )}
      >
        {({ ctx }) => (
          <div className={styles.linkPanel} style={ctx.styles}>
            <Input
              ref={linkInputRef}
              type="url"
              ariaLabel="Link URL"
              className={styles.linkInput}
              fullWidth
              withPadding={false}
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => {
                setLinkUrl(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
              }}
            />
            <Btn variant="brand" size="xs" onMouseDown={preventFocusSteal} onClick={applyLink}>
              Apply
            </Btn>
            {marks.link && (
              <Btn variant="error" size="xs" onMouseDown={preventFocusSteal} onClick={removeLink}>
                Remove
              </Btn>
            )}
          </div>
        )}
      </PopoverWrapper>

      <ToolbarDivider />

      <ColorPicker
        value={currentColor || undefined}
        colorSwatch={COLOR_SWATCHES}
        recentlyUsedColorSwatch={recent}
        label="Text color"
        isOpen={openMenu === "color"}
        onOpenChange={(open) => {
          setOpenMenu(open ? "color" : null);
        }}
        manageFocus={false}
        onChange={applyColor}
        onClear={() => editor.chain().focus().unsetColor().run()}
        renderTrigger={(triggerProps) => (
          <button
            {...(triggerProps as HTMLProps<HTMLButtonElement>)}
            type="button"
            aria-label="Text color"
            className={styles.trigger}
            onMouseDown={preventFocusSteal}
          >
            <span
              className={styles.currentColor}
              style={{ "--rti-current-color": currentColor } as React.CSSProperties}
              aria-hidden="true"
            />
            <ChevronDownIcon className={styles.chevron} aria-hidden="true" />
          </button>
        )}
      />

      <ToolbarDivider />

      <PopoverWrapper
        open={openMenu === "size"}
        onOpenChange={(open) => {
          setOpenMenu(open ? "size" : null);
        }}
        manageFocus={false}
        showArrow
        arrowClassName={styles.tail}
        offsetAmount={12}
        aria-label="Text size"
        renderTrigger={(triggerProps) => (
          <button
            {...(triggerProps as HTMLProps<HTMLButtonElement>)}
            type="button"
            aria-label="Text size"
            className={`${styles.trigger} ${styles.sizeTrigger}`}
            onMouseDown={preventFocusSteal}
          >
            {/* Unset text has no fontSize mark (it renders at the base size,
                which matches none of the choices), so show a neutral glyph
                rather than claiming a specific size. */}
            {activeSize?.letter ?? "Aa"}
            <ChevronDownIcon className={styles.chevron} aria-hidden="true" />
          </button>
        )}
      >
        {({ ctx }) => (
          <div className={styles.menuPanel} style={ctx.styles}>
            {SIZE_CHOICES.map((size) => (
              <button
                key={size.letter}
                type="button"
                className={styles.sizeItem}
                aria-pressed={size === activeSize}
                onMouseDown={preventFocusSteal}
                onClick={() => {
                  editor.chain().focus().setFontSize(size.value).run();
                  setOpenMenu(null);
                }}
              >
                <span>{size.label}</span>
                <span className={`${styles.sizePreview} ${size.previewClass}`} aria-hidden="true">
                  Aa
                </span>
              </button>
            ))}
          </div>
        )}
      </PopoverWrapper>

      {showBlockControls && (
        <>
          <ToolbarDivider />
          <ToolbarBtn
            ariaLabel="Bullet list"
            isActive={marks.bulletList}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <span aria-hidden="true">•</span>
          </ToolbarBtn>
          <ToolbarBtn
            ariaLabel="Numbered list"
            isActive={marks.orderedList}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <span aria-hidden="true">1.</span>
          </ToolbarBtn>

          {onHorizontalAlignChange && (
            <>
              <ToolbarDivider />
              {H_ALIGNS.map(({ value, label }, alignIndex) => (
                <ToolbarBtn
                  key={value}
                  ariaLabel={label}
                  isActive={horizontalAlign === value}
                  onClick={() => {
                    onHorizontalAlignChange(value);
                  }}
                >
                  <AlignGlyph axis="h" index={alignIndex as 0 | 1 | 2} />
                </ToolbarBtn>
              ))}
            </>
          )}

          {onVerticalAlignChange && (
            <>
              <ToolbarDivider />
              {V_ALIGNS.map(({ value, label }, alignIndex) => (
                <ToolbarBtn
                  key={value}
                  ariaLabel={label}
                  isActive={verticalAlign === value}
                  onClick={() => {
                    onVerticalAlignChange(value);
                  }}
                >
                  <AlignGlyph axis="v" index={alignIndex as 0 | 1 | 2} />
                </ToolbarBtn>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
};

export { Toolbar };
export type { HorizontalAlign, VerticalAlign };
