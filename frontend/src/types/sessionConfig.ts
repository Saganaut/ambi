// Single source of truth for the three session-configuration string-union
// types that show up across the deck editor (ThemePanel, BehaviorSection),
// the create-game flow (CreateGamePage, useGameSettings), and the runtime
// cascade resolver (showResponsesResolver). The values mirror the backend
// enums:
//   - SessionFormat            → InteractiveSession.format
//   - ShowResponsesMode        → element/deck/session showResponses cascade
//   - AnswerSubmissionMode     → InteractiveSessionSettings.answerSubmissionMode
// The codegen-generated AmbiApi.ts repeats these literals inline in
// every DTO; pulling them out keeps the rest of the app from having to
// invent local NonNullable<DeckResponse["..."]> aliases.

export type SessionFormat = "GAME" | "PRESENTATION";

export type ShowResponsesMode = "INHERIT" | "INSTANT" | "ON_CLICK" | "PRIVATE";

export type AnswerSubmissionMode = "SIMULTANEOUS" | "TURN_BASED";
