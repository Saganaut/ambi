// Public surface for the reusable slide-editor primitives. Each per-kind
// editor pulls everything it needs from this barrel so the import lines
// stay short.
export { PromptField } from "./PromptField";
export type { PromptFieldProps } from "./PromptField";
export { SectionHeader } from "./SectionHeader";
export { SettingsCard, SettingsRow } from "./SettingsCard";
export { ItemCard } from "./ItemCard";
export { ItemList } from "./ItemList";
export { PhraseOrImageCard } from "./PhraseOrImageCard/PhraseOrImageCard";
export type { PhraseOrImageItem } from "./PhraseOrImageCard/PhraseOrImageCard";
// export { ImageBackingEditor } from "./ImageBackingEditor";
export { ScoringFooter } from "./ScoringFooter";
export { EmptySelect } from "./EmptySelect";
