/**
 * Exercises ColoredListItem's auto-sync: a list item's bullet color tracks the
 * item's text, but only when every piece of that text shares one color. Driven
 * through a headless TipTap editor with the same extension set the app uses.
 */
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color, FontSize } from "@tiptap/extension-text-style";
import { ColoredListItem } from "./ColoredListItem";

const makeEditor = (content: string) =>
  new Editor({
    extensions: [
      StarterKit.configure({ listItem: false }),
      ColoredListItem,
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

let editor: Editor;
afterEach(() => editor?.destroy());

// The first <li>'s inline color, or null when it has none. Values are compared
// rather than string-matched because serialization normalizes them (jsdom turns
// hex into rgb() and appends ";"), while the color-tracking property holds.
const liColor = (html: string) =>
  html.match(/<li style="color: ([^;"]+)/)?.[1] ?? null;
const firstSpanColor = (html: string) =>
  html.match(/<span style="color: ([^;"]+)/)?.[1] ?? null;

describe("ColoredListItem", () => {
  it("gives the <li> the item's color when all its text is one color", () => {
    editor = makeEditor("<ul><li>hello world</li></ul>");
    editor.chain().selectAll().setColor("#e53e3e").run();
    const html = editor.getHTML();
    // The marker color must track the (single) text color.
    expect(liColor(html)).not.toBeNull();
    expect(liColor(html)).toBe(firstSpanColor(html));
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
    expect(liColor(editor.getHTML())).toBeNull();
  });

  it("clears the <li> color when the text color is unset", () => {
    editor = makeEditor("<ul><li>hello world</li></ul>");
    editor.chain().selectAll().setColor("#e53e3e").run();
    expect(liColor(editor.getHTML())).not.toBeNull();

    editor.chain().selectAll().unsetColor().run();
    expect(liColor(editor.getHTML())).toBeNull();
  });

  it("keeps theme-ref colors verbatim on the <li>", () => {
    editor = makeEditor("<ul><li>hello</li></ul>");
    editor.chain().selectAll().setColor("var(--role-accent)").run();
    // Custom-property refs aren't resolved, so they survive round-trips.
    expect(liColor(editor.getHTML())).toBe("var(--role-accent)");
  });

  it("colors only the fully-colored item, not its sibling", () => {
    editor = makeEditor("<ul><li>first</li><li>second</li></ul>");
    editor
      .chain()
      .setTextSelection(rangeOf(editor, "first"))
      .setColor("#38a169")
      .run();
    const html = editor.getHTML();
    expect(liColor(html)).toBe(firstSpanColor(html));
    // The second item was never colored, so its marker stays default.
    expect(html).toMatch(/<li><p>second<\/p><\/li>/);
  });
});
