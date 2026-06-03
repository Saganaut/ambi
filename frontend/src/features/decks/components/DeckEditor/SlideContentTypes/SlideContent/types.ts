// Shared types + constants for the SlideContent (non-interactive slide) editor.
// Splitting these out lets each block-kind editor live in its own file
// without needing to repeat the union/label maps.
import type { Slide } from "@/store/AmbiApi";
import type {
  CalloutTone,
  SlideBlockKind,
  SlideBlockUnion,
} from "@/store/slideBlockTypes";

export type SlideBlockShape = NonNullable<Slide["blocks"]>[number];

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
