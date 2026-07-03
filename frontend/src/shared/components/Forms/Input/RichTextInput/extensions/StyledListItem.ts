/**
 * A ListItem node that carries its own `color` and `font-size` so the
 * bullet/number marker can follow the item's text.
 *
 * TipTap's `Color` / `FontSize` extensions apply these as inline `textStyle`
 * marks — a `<span style="color:…;font-size:…">` *inside* the `<li>`. CSS
 * `::marker` inherits `color` and `font-size` from the list-item element, never
 * from a descendant span, and can't read one either. So the only way to make a
 * marker match its text is to put the value on the `<li>` itself. This extension
 * adds those attributes (rendered as an inline style, verbatim — so
 * `var(--role-*)` theme refs and rem sizes survive round-trips) and a
 * ProseMirror plugin that keeps them in sync: whenever every piece of text in an
 * item shares one value the `<li>` takes it; otherwise (empty, mixed, or any
 * unstyled text) it clears, and the marker falls back to the default.
 *
 * The sync runs as an appended transaction so it stays correct no matter how the
 * value changed — typing, the toolbar swatches/sizes, unset, or paste.
 */
import { ListItem } from "@tiptap/extension-list-item";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { MarkType, Node as ProseMirrorNode, Schema } from "@tiptap/pm/model";

const syncKey = new PluginKey("styledListItemSync");

/** The `textStyle` attributes mirrored onto the `<li>`, each with its CSS name. */
const SYNCED_STYLES = [
  { attr: "color", css: "color" },
  { attr: "fontSize", css: "font-size" },
] as const;

/**
 * The single value of `textStyle` attribute `attrName` shared by all of a list
 * item's own text, or null when the item is empty, has mixed values, or contains
 * any text without it. Nested lists are skipped — each nested item owns its own
 * marker.
 */
const uniformItemValue = (
  li: ProseMirrorNode,
  textStyleType: MarkType | undefined,
  attrName: string,
): string | null => {
  let seen: string | null | undefined; // undefined = not yet seen any text
  let sawText = false;
  let mixed = false;

  li.descendants((node) => {
    if (mixed) return false;
    const name = node.type.name;
    // Don't descend into a nested list — its items are synced independently.
    // A nested `listItem` only ever reaches here via its wrapping list, which
    // already short-circuits above; it's listed too as a defensive guard.
    if (name === "bulletList" || name === "orderedList" || name === "listItem") {
      return false;
    }
    if (!node.isText) return true;
    sawText = true;
    const mark = textStyleType
      ? node.marks.find((m) => m.type === textStyleType)
      : undefined;
    const value = (mark?.attrs[attrName] as string | undefined) ?? null;
    if (seen === undefined) seen = value;
    else if (seen !== value) mixed = true;
    return true;
  });

  if (!sawText || mixed || seen === undefined || seen === null) return null;
  return seen;
};

/**
 * Rewrites each list item's synced attributes to match its uniform text.
 * Guarded against re-entrancy (its own transactions carry `syncKey` meta) and
 * only dispatches when an attribute actually changes; folded into the same undo
 * step as the edit that triggered it (`addToHistory: false`).
 */
const styledListItemSyncPlugin = (schema: Schema): Plugin => {
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
        let attrs = node.attrs;
        let changed = false;
        for (const { attr } of SYNCED_STYLES) {
          const target = uniformItemValue(node, textStyleType, attr);
          const current = (attrs[attr] as string | null) ?? null;
          if (target !== current) {
            attrs = { ...attrs, [attr]: target };
            changed = true;
          }
        }
        if (changed) {
          // Attr-only markup keeps the node size, so positions from the
          // pre-edit doc stay valid across multiple updates in this tr.
          tr.setNodeMarkup(pos, undefined, attrs);
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
export const StyledListItem = ListItem.extend({
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
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize || null,
        renderHTML: (attributes: Record<string, unknown>) => {
          const fontSize = attributes.fontSize as string | null;
          return fontSize ? { style: `font-size: ${fontSize}` } : {};
        },
      },
    };
  },

  addProseMirrorPlugins() {
    const parentPlugins = this.parent?.() ?? [];
    return [...parentPlugins, styledListItemSyncPlugin(this.editor.schema)];
  },
});
