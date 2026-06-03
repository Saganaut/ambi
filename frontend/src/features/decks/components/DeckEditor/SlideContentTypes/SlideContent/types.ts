// Shared types + constants for the SlideContent (non-interactive slide) editor.
// Splitting these out lets each block-kind editor live in its own file
// without needing to repeat the union/label maps.
//
// TODO(migration): stubbed pending slide-block migration. The block-type
// definitions and helpers below previously lived in `@store/slideBlockTypes`,
// which no longer exists. They're inlined here as minimal local placeholders
// so the sibling block editors still resolve their imports; replace with the
// real generated/shared types once the slide-block migration lands.
import type { Slide, Image } from "@store/AmbiApi";

export type SlideBlockShape = NonNullable<Slide["blocks"]>[number];

// ── Placeholder block types (TODO(migration)) ──────────────────────────────

export type SlideBlockKind =
  | "HeadingBlock"
  | "BodyBlock"
  | "BulletListBlock"
  | "ImageBlock"
  | "CalloutBlock";

export type CalloutTone = "INFO" | "WARN" | "SUCCESS";

interface BaseBlock {
  id: string;
}

export interface HeadingBlock extends BaseBlock {
  kind: "HeadingBlock";
  text?: string;
  level?: number;
}

export interface BodyBlock extends BaseBlock {
  kind: "BodyBlock";
  richBody?: string;
}

export interface BulletListBlock extends BaseBlock {
  kind: "BulletListBlock";
  items?: string[];
}

export interface ImageBlock extends BaseBlock {
  kind: "ImageBlock";
  image?: Image;
  caption?: string;
}

export interface CalloutBlock extends BaseBlock {
  kind: "CalloutBlock";
  tone?: CalloutTone;
  richBody?: string;
}

export type SlideBlockUnion =
  | HeadingBlock
  | BodyBlock
  | BulletListBlock
  | ImageBlock
  | CalloutBlock;

const KNOWN_BLOCK_KINDS: SlideBlockKind[] = [
  "HeadingBlock",
  "BodyBlock",
  "BulletListBlock",
  "ImageBlock",
  "CalloutBlock",
];

/** Narrow a raw cached block to the typed union, or null if its `kind` is
 *  not one we recognise. TODO(migration): placeholder. */
export const narrowSlideBlock = (raw: unknown): SlideBlockUnion | null => {
  const block = raw as Partial<SlideBlockUnion> | null;
  if (
    block &&
    typeof block.id === "string" &&
    typeof block.kind === "string" &&
    KNOWN_BLOCK_KINDS.includes(block.kind as SlideBlockKind)
  ) {
    return block as SlideBlockUnion;
  }
  return null;
};

/** Build a fresh block of the requested kind. TODO(migration): placeholder. */
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

export type BlockUpdateMode = "schedule" | "commit";

export const SLIDE_KIND_OPTIONS: {
  value: NonNullable<Slide["slideKind"]>;
  label: string;
}[] = [
  { value: "TITLE", label: "Title" },
  { value: "SECTION", label: "Section" },
  { value: "CALLOUT", label: "Callout" },
  { value: "CONTENT", label: "Content" },
  { value: "END", label: "End" },
];

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

export type BlockUpdate = (
  next: SlideBlockUnion,
  mode: BlockUpdateMode,
) => void;
