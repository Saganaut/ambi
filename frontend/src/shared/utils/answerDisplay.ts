// Shared formatting helpers for per-round answer reveals. Used by the live
// RoundResult overlay (and any future review-style surface that wants the
// same readable strings). Returns null when the payload/element has no
// human-readable answer so callers can conditionally render or supply
// their own fallback.
import type { AnswerPayload, DeckElement } from "../types/elements";

/** Resolves the canonical correct answer for display per element kind. */
const correctAnswerText = (element: DeckElement): string | null => {
  switch (element.kind) {
    case "McqQuestion": {
      // Multiple correct answers possible — join their option texts.
      const correctIds = new Set(element.correctOptionIds ?? []);
      const correctTexts = (element.options ?? [])
        .filter((o) => o.id && correctIds.has(o.id))
        .map((o) => o.text ?? "")
        .filter(Boolean);
      return correctTexts.length > 0 ? correctTexts.join(", ") : null;
    }
    case "TextQuestion":
      return element.correctAnswer ?? null;
    case "NumberQuestion":
      return element.correctValue !== undefined
        ? `${element.correctValue}${element.unitLabel ?? ""}`
        : null;
    default:
      return null;
  }
};

/** Renders a human-readable string for what the player submitted. */
const humanReadableAnswer = (
  element: DeckElement,
  payload: AnswerPayload,
): string | null => {
  switch (payload.kind) {
    case "TimeoutAnswer":
      return "(timed out)";
    case "TextAnswer":
      return payload.text ?? null;
    case "NumberAnswer":
      return payload.value !== undefined ? String(payload.value) : null;
    case "McqAnswer": {
      const oid = payload.optionIds?.[0];
      if (element.kind === "McqQuestion") {
        const opt = element.options?.find((o) => o.id === oid);
        return opt?.text ?? null;
      }
      return oid ?? null;
    }
    case "DrawingAnswer": {
      const strokeCount = payload.strokes?.length ?? 0;
      return strokeCount > 0 ? "(drawing)" : "(blank)";
    }
    default:
      return null;
  }
};

export { correctAnswerText, humanReadableAnswer };
