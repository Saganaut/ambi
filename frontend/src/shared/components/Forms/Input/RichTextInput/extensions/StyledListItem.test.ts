/**
 * Exercises StyledListItem's auto-sync: a list item's marker color and size
 * track the item's text, but only when every piece of that text shares one
 * value. Driven through a headless TipTap editor with the same extension set the
 * app uses.
 */
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color, FontSize } from "@tiptap/extension-text-style";
import { StyledListItem } from "./StyledListItem";

const makeEditor = (content: string) =>
  new Editor({
    extensions: [
      StarterKit.configure({ listItem: false, heading: false }),
      StyledListItem,
      TextStyle,
      Color,
      FontSize,
    ],
    content,
  });

/** Selection range covering the first occurrence of `substr` in the doc. */
const rangeOf = (editor: Editor, substr: string) => {
  let range: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (range || !node.isText || !node.text) return true;
    const idx = node.text.indexOf(substr);
    if (idx === -1) return true;
    range = { from: pos + idx, to: pos + idx + substr.length };
    return false;
  });
  if (!range) throw new Error(`text not found: ${substr}`);
  return range;
};

// The first <li>'s inline style, and a single CSS property read out of it.
// Values are compared rather than string-matched because serialization
// normalizes them (jsdom turns hex into rgb() and appends ";").
const firstLiStyle = (html: string) => html.match(/<li style="([^"]*)"/)?.[1] ?? "";
const firstSpanStyle = (html: string) => html.match(/<span style="([^"]*)"/)?.[1] ?? "";
const cssProp = (style: string, prop: string) =>
  style.match(new RegExp(`${prop}:\\s*([^;]+)`))?.[1]?.trim() ?? null;

let editor: Editor;
afterEach(() => editor?.destroy());

describe("StyledListItem", () => {
  it("gives the <li> the item's color when all its text is one color", () => {
    editor = makeEditor("<ul><li>hello world</li></ul>");
    editor.chain().selectAll().setColor("#e53e3e").run();
    const html = editor.getHTML();
    // The marker color must track the (single) text color.
    const liColor = cssProp(firstLiStyle(html), "color");
    expect(liColor).not.toBeNull();
    expect(liColor).toBe(cssProp(firstSpanStyle(html), "color"));
  });

  it("gives the <li> the item's font-size when all its text is one size", () => {
    editor = makeEditor("<ul><li>hello world</li></ul>");
    editor.chain().selectAll().setFontSize("2.75rem").run();
    const html = editor.getHTML();
    expect(cssProp(firstLiStyle(html), "font-size")).toBe("2.75rem");
  });

  it("syncs color and font-size together onto the <li>", () => {
    editor = makeEditor("<ul><li>hello</li></ul>");
    editor.chain().selectAll().setColor("#38a169").setFontSize("1.875rem").run();
    const style = firstLiStyle(editor.getHTML());
    expect(cssProp(style, "color")).not.toBeNull();
    expect(cssProp(style, "font-size")).toBe("1.875rem");
  });

  it("leaves the <li> uncolored when the item has mixed colors", () => {
    editor = makeEditor("<ul><li>hello world</li></ul>");
    editor.chain().selectAll().setColor("#e53e3e").run();
    editor
      .chain()
      .setTextSelection(rangeOf(editor, "world"))
      .setColor("#3182ce")
      .run();
    // No longer uniform, so the marker falls back to the default.
    expect(cssProp(firstLiStyle(editor.getHTML()), "color")).toBeNull();
  });

  it("clears the <li> font-size when sizes become mixed", () => {
    editor = makeEditor("<ul><li>hello world</li></ul>");
    editor.chain().selectAll().setFontSize("2.75rem").run();
    expect(cssProp(firstLiStyle(editor.getHTML()), "font-size")).toBe("2.75rem");

    editor
      .chain()
      .setTextSelection(rangeOf(editor, "world"))
      .setFontSize("0.875rem")
      .run();
    expect(cssProp(firstLiStyle(editor.getHTML()), "font-size")).toBeNull();
  });

  it("clears the <li> color when the text color is unset", () => {
    editor = makeEditor("<ul><li>hello world</li></ul>");
    editor.chain().selectAll().setColor("#e53e3e").run();
    expect(cssProp(firstLiStyle(editor.getHTML()), "color")).not.toBeNull();

    editor.chain().selectAll().unsetColor().run();
    expect(cssProp(firstLiStyle(editor.getHTML()), "color")).toBeNull();
  });

  it("keeps theme-ref colors verbatim on the <li>", () => {
    editor = makeEditor("<ul><li>hello</li></ul>");
    editor.chain().selectAll().setColor("var(--role-accent)").run();
    // Custom-property refs aren't resolved, so they survive round-trips.
    expect(cssProp(firstLiStyle(editor.getHTML()), "color")).toBe("var(--role-accent)");
  });

  it("colors only the fully-colored item, not its sibling", () => {
    editor = makeEditor("<ul><li>first</li><li>second</li></ul>");
    editor
      .chain()
      .setTextSelection(rangeOf(editor, "first"))
      .setColor("#38a169")
      .run();
    const html = editor.getHTML();
    expect(cssProp(firstLiStyle(html), "color")).toBe(
      cssProp(firstSpanStyle(html), "color"),
    );
    // The second item was never colored, so its marker stays default.
    expect(html).toMatch(/<li><p>second<\/p><\/li>/);
  });

  it("does not let a nested list's color affect its parent item", () => {
    // Outer item text is red; the nested sub-item is blue. The outer <li> must
    // track only its own text (red), independent of the sub-list.
    editor = makeEditor(
      "<ul><li><p>outer</p><ul><li><p>inner</p></li></ul></li></ul>",
    );
    editor
      .chain()
      .setTextSelection(rangeOf(editor, "outer"))
      .setColor("#e53e3e")
      .run();
    editor
      .chain()
      .setTextSelection(rangeOf(editor, "inner"))
      .setColor("#3182ce")
      .run();

    const html = editor.getHTML();
    // "outer" precedes "inner" in document order, so the first <li> and first
    // <span> are both the outer item's. Its marker must track the outer text
    // color (not be blanked to null by the nested item's different color).
    expect(cssProp(firstLiStyle(html), "color")).not.toBeNull();
    expect(cssProp(firstLiStyle(html), "color")).toBe(
      cssProp(firstSpanStyle(html), "color"),
    );
  });
});
