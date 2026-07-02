// Content-slide block model for the SlideContent (non-interactive "content"
// slide) editor.
//
// The block types are now BACKEND-OWNED and generated: a content slide's body is
// the polymorphic `TitleContent.blocks: SlideBlock[]` on `SlideResponse`/
// `SlideRequest` (discriminated by `block.kind`). This module re-exports the
// generated union under the names the editor already uses and adds only the
// frontend-only authoring helpers (the update protocol, the picker option/label
// maps, and the factory/narrow helpers) that have no backend equivalent.
import type {
  BodyBlock,
  BulletListBlock,
  CalloutBlock,
  HeadingBlock,
  ImageBlock,
  SlideBlock,
} from "@deck/store/deckApi.gen";
import {
  CalloutTone,
  SlideBlockKind,
  SLIDE_BLOCK_KIND_LIST,
} from "@deck/store/deckEnums.gen";

// ── Generated block types (re-exported under the editor's existing names) ────

export type {
  BodyBlock,
  BulletListBlock,
  CalloutBlock,
  HeadingBlock,
  ImageBlock,
};
export { CalloutTone, SlideBlockKind };

/** The discriminated union of every block kind (generated `SlideBlock`). */
export type SlideBlockUnion = SlideBlock;

/** Narrow a raw cached block to the typed union, or null if its `kind` is
 *  not one we recognise (defends against legacy/corrupt cache entries). */
export const narrowSlideBlock = (raw: unknown): SlideBlockUnion | null => {
  const block = raw as Partial<SlideBlockUnion> | null;
  if (
    block &&
    typeof block.id === "string" &&
    typeof block.kind === "string" &&
    (SLIDE_BLOCK_KIND_LIST as string[]).includes(block.kind)
  ) {
    return block as SlideBlockUnion;
  }
  return null;
};

/** Build a fresh block of the requested kind with a client-minted id. */
export const createSlideBlock = (kind: SlideBlockKind): SlideBlockUnion => {
  const id = crypto.randomUUID();
  switch (kind) {
    case "HeadingBlock":
      return { kind, id, text: "", level: 2 };
    case "BodyBlock":
      return { kind, id, richBody: "" };
    case "BulletListBlock":
      return { kind, id, items: [""] };
    case "ImageBlock":
      return { kind, id };
    case "CalloutBlock":
      return { kind, id, tone: "INFO", richBody: "" };
  }
};

// ── Editor update protocol (frontend-only) ───────────────────────────────────

export type BlockUpdateMode = "schedule" | "commit";

export type BlockUpdate = (
  next: SlideBlockUnion,
  mode: BlockUpdateMode,
) => void;

// ── Author-surface option/label maps ─────────────────────────────────────────

export const BLOCK_KIND_OPTIONS: { value: SlideBlockKind; label: string }[] = [
  { value: "HeadingBlock", label: "Heading" },
  { value: "BodyBlock", label: "Body text" },
  { value: "BulletListBlock", label: "Bullet list" },
  { value: "ImageBlock", label: "Image" },
  { value: "CalloutBlock", label: "Callout" },
];

export const BLOCK_KIND_LABEL: Record<SlideBlockKind, string> = {
  HeadingBlock: "Heading",
  BodyBlock: "Body text",
  BulletListBlock: "Bullet list",
  ImageBlock: "Image",
  CalloutBlock: "Callout",
};

export const HEADING_LEVELS: { value: string; label: string }[] = [
  { value: "1", label: "H1 — large" },
  { value: "2", label: "H2 — medium" },
  { value: "3", label: "H3 — small" },
];

export const CALLOUT_TONES: { value: CalloutTone; label: string }[] = [
  { value: "INFO", label: "Info" },
  { value: "WARN", label: "Warn" },
  { value: "SUCCESS", label: "Success" },
];
