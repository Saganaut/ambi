export interface deckAndSlideIdProps {
  slideId: string;
  deckId: string;
}

/** Which dedicated image slot (cover or background) a handler targets. */
export type ImageRole = "cover" | "background";
