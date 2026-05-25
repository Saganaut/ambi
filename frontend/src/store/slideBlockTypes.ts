/**
 * Typed discriminated union for Slide.blocks (chunk 10c).
 *
 * The backend exposes SlideBlock as a sealed interface with five permits
 * records, but Springdoc only emits per-kind schemas for types reachable from
 * a controller method signature. Slide.blocks is the only reference, so the
 * codegen produces an opaque `{ kind: string }` SlideBlock. This file fills
 * that gap by re-stating the per-kind shapes the backend serializes — `kind`
 * is the Jackson class simple name ("HeadingBlock", "BodyBlock", …), set by
 * the backend's `@JsonTypeInfo(use = NAME, property = "kind")`.
 *
 * Imports of the generated SlideBlock type from BrainFlexApi.ts widen to this
 * union via {@link narrowSlideBlock}, which preserves runtime safety: an
 * unknown kind is surfaced as `null` rather than silently cast.
 */
import type { Image, SlideBlock } from "@/store/BrainFlexApi";

export interface HeadingBlock {
  kind: "HeadingBlock";
  id: string;
  text?: string;
  level?: number;
}

export interface BodyBlock {
  kind: "BodyBlock";
  id: string;
  richBody?: string;
}

export interface BulletListBlock {
  kind: "BulletListBlock";
  id: string;
  items?: string[];
}

export interface ImageBlock {
  kind: "ImageBlock";
  id: string;
  image?: Image;
  caption?: string;
}

export type CalloutTone = "INFO" | "WARN" | "SUCCESS";

export interface CalloutBlock {
  kind: "CalloutBlock";
  id: string;
  richBody?: string;
  tone?: CalloutTone;
}

export type SlideBlockUnion =
  | HeadingBlock
  | BodyBlock
  | BulletListBlock
  | ImageBlock
  | CalloutBlock;

export type SlideBlockKind = SlideBlockUnion["kind"];

const KNOWN_KINDS: ReadonlySet<string> = new Set<SlideBlockKind>([
  "HeadingBlock",
  "BodyBlock",
  "BulletListBlock",
  "ImageBlock",
  "CalloutBlock",
]);

/** Narrow a generic SlideBlock from the codegen to the typed union. Returns
 *  null for unknown kinds so callers can render a fallback rather than throw. */
export const narrowSlideBlock = (block: SlideBlock): SlideBlockUnion | null => {
  if (!block.kind || !KNOWN_KINDS.has(block.kind)) return null;
  return block as SlideBlockUnion;
};

/** Factory for a freshly-minted block. `crypto.randomUUID()` produces a stable
 *  per-block id that survives reorder / remount. */
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
      return { kind, id, caption: "" };
    case "CalloutBlock":
      return { kind, id, richBody: "", tone: "INFO" };
  }
};
