// Frontend-only block model for the SlideContent (non-interactive slide) editor.
//
// IMPORTANT: none of the "block" concepts below exist on the backend. A slide's
// persisted body is the polymorphic `content` (`SlideContent`, discriminated by
// `content.contentType`) on `SlideResponse`/`SlideRequest` — there is no `blocks`
// array and no `slideKind` field in `Slide.java`. These types model the editor's local
// authoring/layout state only; they're a starting point for the slide-layout
// migration and are expected to evolve.
//
// The ONE thing here that is backend-owned is the image payload: an `ImageBlock`
// carries an `AppImage` from the generated client (the same shape the server
// stores on `coverImage`/`backgroundImage`).
//
// TODO(migration): once the backend models slide layout, replace the bespoke
// union/helpers below with generated/shared types and mirror any enums into
// `@store/enums` per the project convention.
import type { AppImage } from "@store/AmbiApi";

// ── Block kinds ────────────────────────────────────────────────────────────

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
  image?: AppImage;
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

// ── Slide layout role ────────────────────────────────────────────────────────
//
// Frontend-only presentation role for a slide, distinct from the backend's
// `content.contentType` discriminator (MCQ, DRAWING, …). The lobby slide uses
// "TITLE"; see RightSidebar `relevanceFor`.
export type SlideKind = "TITLE" | "SECTION" | "CALLOUT" | "CONTENT" | "END";

// ── Editor update protocol ───────────────────────────────────────────────────

export type BlockUpdateMode = "schedule" | "commit";

export type BlockUpdate = (
  next: SlideBlockUnion,
  mode: BlockUpdateMode,
) => void;

// ── Author-surface option/label maps ─────────────────────────────────────────

export const SLIDE_KIND_OPTIONS: { value: SlideKind; label: string }[] = [
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
