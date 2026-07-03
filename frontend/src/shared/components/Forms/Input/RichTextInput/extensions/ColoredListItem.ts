/**
 * A ListItem node that carries its own `color` so the bullet/number marker can
 * follow the text color.
 *
 * TipTap's `Color` extension applies color as an inline `textStyle` mark — a
 * `<span style="color:…">` *inside* the `<li>`. CSS `::marker` inherits `color`
 * from the list-item element, never from a descendant span, and it can't read
 * one either. So the only way to tint a bullet is to put the color on the `<li>`
 * itself. This extension adds that `color` attribute (rendered as an inline
 * style, verbatim — so `var(--role-*)` theme refs survive round-trips) and a
 * ProseMirror plugin that keeps it in sync: whenever every piece of text in an
 * item shares one color the `<li>` takes that color; otherwise (empty, mixed,
 * or any uncolored text) it clears, and the marker falls back to the default.
 *
 * The sync runs as an appended transaction so it stays correct no matter how the
 * color changed — typing, the color swatches, unsetColor, or paste.
 */
import { ListItem } from "@tiptap/extension-list-item";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { MarkType, Node as ProseMirrorNode, Schema } from "@tiptap/pm/model";

const syncKey = new PluginKey("coloredListItemSync");

/**
 * The single color shared by all of a list item's own text, or null when the
 * item is empty, has mixed colors, or contains any uncolored text. Nested lists
 * are skipped — each nested item owns its own marker.
 */
const uniformItemColor = (
  li: ProseMirrorNode,
  textStyleType: MarkType | undefined,
): string | null => {
  let seen: string | null | undefined; // undefined = not yet seen any text
  let sawText = false;
  let mixed = false;

  li.descendants((node) => {
    if (mixed) return false;
    const name = node.type.name;
    // Don't descend into a nested list — its items are synced independently.
    if (name === "bulletList" || name === "orderedList" || name === "listItem") {
      return false;
    }
    if (!node.isText) return true;
    sawText = true;
    const mark = textStyleType
      ? node.marks.find((m) => m.type === textStyleType)
      : undefined;
    const color = (mark?.attrs.color as string | undefined) ?? null;
    if (seen === undefined) seen = color;
    else if (seen !== color) mixed = true;
    return true;
  });

  if (!sawText || mixed || seen === undefined || seen === null) return null;
  return seen;
};

/**
 * Rewrites each list item's `color` attribute to match its uniform text color.
 * Guarded against re-entrancy (its own transactions carry `syncKey` meta) and
 * only dispatches when an attribute actually changes; folded into the same undo
 * step as the edit that triggered it (`addToHistory: false`).
 */
const coloredListItemSyncPlugin = (schema: Schema): Plugin => {
  const listItemType = schema.nodes.listItem;
  const textStyleType = schema.marks.textStyle as MarkType | undefined;

  return new Plugin({
    key: syncKey,
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((tr) => tr.docChanged)) return null;
      if (transactions.some((tr) => tr.getMeta(syncKey))) return null;

      const tr = newState.tr;
      let modified = false;
      newState.doc.descendants((node, pos) => {
        if (node.type !== listItemType) return true;
        const target = uniformItemColor(node, textStyleType);
        const current = (node.attrs.color as string | null) ?? null;
        if (target !== current) {
          // Attr-only markup keeps the node size, so positions from the
          // pre-edit doc stay valid across multiple updates in this tr.
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, color: target });
          modified = true;
        }
        return true; // descend so nested items are synced too
      });

      if (!modified) return null;
      tr.setMeta(syncKey, true);
      tr.setMeta("addToHistory", false);
      return tr;
    },
  });
};

/**
 * StarterKit's `listItem` must be disabled when this is registered
 * (`StarterKit.configure({ listItem: false })`) so there's a single list-item
 * node in the schema.
 */
export const ColoredListItem = ListItem.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      color: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.color || null,
        renderHTML: (attributes: Record<string, unknown>) => {
          const color = attributes.color as string | null;
          return color ? { style: `color: ${color}` } : {};
        },
      },
    };
  },

  addProseMirrorPlugins() {
    const parentPlugins = this.parent?.() ?? [];
    return [...parentPlugins, coloredListItemSyncPlugin(this.editor.schema)];
  },
});
