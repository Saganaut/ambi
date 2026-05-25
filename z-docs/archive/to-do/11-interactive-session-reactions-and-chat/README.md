# 11 — InteractiveSession reactions & chat

**Status:** Complete (2026-05-21). Backend (2026-05-19) — models, repos, settings flags, STOMP destinations, REST fallbacks, Redis-backed reaction aggregation, rate limiter, emoji allow-list, host moderation, and `InteractiveSessionService` accept methods landed with tests (244/244 backend tests pass). Frontend codegen — `useSendReactionMutation` / `useSendChatMutation` / `useListChatQuery` / `useModerateChatMutation` are wired. Player + host UI now landed: `ReactionBar` (player), `ReactionRain` (host, CSS-keyframe bursts), `ChatPanel` (collapsible sidebar with optimistic send + STOMP reconcile, host hover-to-hide moderation, `(hidden by host)` placeholder for non-hosts), all gated on `session.settings.reactionsEnabled` / `chatEnabled` and mounted on `PlayPage`. STOMP subscriptions for `/topic/interactive-session/{roomCode}/reaction` + `/chat` feed the slice; optimistic chat send + moderation flips live in `store/enhancements/chat.ts`.
**Depends on:** Nothing strict; pairs well with chunk 13 (settings flags) and chunk 18 (notifications hooks for `@mention`)
**Unblocks:** 13 (`InteractiveSessionPlayer.reactionsSent` counter)

## Scope

Two engagement features that live inside an active InteractiveSession:

1. **Reactions** — players send single-emoji bursts during a round; they fly across the host screen. Stored for analytics + replays.
2. **Chat** — audience chat sidebar during the show, with host moderation.

Both flow over the existing STOMP WebSocket. Both are gated behind per-InteractiveSession settings flags so hosts can turn them off.

## New models

```text
Reaction                               @Document("reactions")
  @Id String id
  @Indexed String interactiveSessionId
  String elementId                     // which round it landed on (snapshot)
  String userId, userName              // userName is denorm for display
  boolean isGuest
  String emoji                         // single emoji codepoint, validated
  long offsetMs                        // ms since `roundStartedAt`
  LocalDateTime sentAt
```

```text
InteractiveSessionChatMessage                    @Document("interactive_session_chat")
  @Id String id
  @Indexed String interactiveSessionId
  String authorUserId, authorName, authorPictureUrl
  boolean fromHost
  boolean isGuest
  String body                          // max 500 chars, plain text
  LocalDateTime sentAt
  boolean moderated                    // host hid the message
  String moderatedByUserId
  LocalDateTime moderatedAt
```

Indexes for both: compound `(interactiveSessionId, sentAt DESC)`.

## Backend changes

- New STOMP destinations:
  - Client → server: `/app/interactive-session/{roomCode}/reaction` and `/app/interactive-session/{roomCode}/chat`
  - Server → topic: `/topic/interactive-session/{roomCode}/reaction` and `/topic/interactive-session/{roomCode}/chat`
- New REST fallbacks:
  - `POST /api/interactive-sessions/{roomCode}/reactions` — body `{ emoji }`; for clients without an open WS
  - `POST /api/interactive-sessions/{roomCode}/chat` — body `{ body }`
  - `GET  /api/interactive-sessions/{roomCode}/chat?page=` — replay chat history (for late-joiners)
  - `PUT  /api/interactive-sessions/{roomCode}/chat/{messageId}/moderate` — host only; flip `moderated=true`
- Service rules:
  - `InteractiveSessionService.acceptReaction(...)` — validates `settings.reactionsEnabled` and the current element's `reactionsEnabled` flag (chunk 10). Validates emoji length and a unicode-emoji-regex allow-list. Rate-limit per player (e.g. max 10 reactions / 5s).
  - `InteractiveSessionService.acceptChat(...)` — validates `settings.chatEnabled`, length ≤ 500, rate-limits per player. Auto-flags the host's messages with `fromHost=true`.
- Aggregation:
  - Reactions: cached count per emoji per element in `InteractiveSessionCacheService` (Redis HINCRBY); persisted to Mongo asynchronously.
  - Chat: stream the latest 50 messages on join (replay) and append new ones live.

## Frontend changes

- `ReactionBar` component pinned to the player view — six default emojis (configurable later) with a long-press for the full picker. Wires `useSendReactionMutation` (or the STOMP send directly).
- `ReactionRain` component on the host view — listens to the `/topic/.../reaction` subscription and animates emoji flying across the screen. Use CSS transforms + `requestAnimationFrame`.
- `ChatPanel` sidebar — toggleable on host + player views. Shows the latest messages, host messages styled distinctively. Optimistic local append on send; reconcile when the STOMP echo arrives.
- Host moderation: hover a message → "Hide" button → flips `moderated=true`. Hidden messages render as a placeholder "(hidden by host)" for non-hosts.

## Settings flags

Add these to `InteractiveSessionSettings` (also covered in chunk 13 but list here so the dependency is obvious):

- `boolean reactionsEnabled` — default `true`
- `boolean chatEnabled` — default `true`

Plus the existing per-slide `reactionsEnabled` from chunk 10 lets hosts mute reactions on, e.g., a moment-of-silence slide.

## Rate limiting

Per-player per-minute caps, enforced via Redis sorted-set sliding window:

- Reactions: 30 / minute
- Chat: 20 / minute, with a token-bucket cool-down after that

Over-limit submissions get a `429` HTTP response (REST) or a STOMP error frame.

## Checklist

- [x] `Reaction` + `InteractiveSessionChatMessage` models + repos + indexes — `model/Reaction.java`, `model/InteractiveSessionChatMessage.java`, `repository/ReactionRepository.java`, `repository/InteractiveSessionChatMessageRepository.java` with compound `(interactiveSessionId, sentAt DESC)` indexes on each
- [x] STOMP destinations registered in `InteractiveSessionWebSocketController` — `/app/interactive-session/{roomCode}/reaction`, `/app/interactive-session/{roomCode}/chat`, `/app/interactive-session/{roomCode}/chat/moderate` broadcasting on `/topic/interactive-session/{roomCode}/reaction` and `/topic/interactive-session/{roomCode}/chat`
- [x] `InteractiveSessionService` accept methods + rate limiting + emoji validation — `acceptReaction`, `acceptChat`, `moderateChatMessage`, `listChatHistory`, gated by `InteractiveSessionSettings.reactionsEnabled/chatEnabled` and per-element `DeckElement.reactionsEnabled()` from chunk 10
- [x] REST fallback endpoints + tests — `InteractiveSessionController` exposes `POST /reactions`, `POST /chat`, `GET /chat?page=&size=`, `PUT /chat/{messageId}/moderate`
- [x] Redis-backed aggregation for reaction counts — `InteractiveSessionCacheService.incrementReactionCount` / `getReactionCounts` (HINCRBY on `reactions:counts:{roomCode}:{elementId}`)
- [x] `InteractiveSessionSettings.reactionsEnabled`, `chatEnabled` flags (coordinate with chunk 13) — defaults `true`; wired through `CreateInteractiveSessionRequest`
- [x] `EmojiAllowList` static allow-list (13 default emojis) + `InteractiveSessionRateLimiter` (Redis ZSET sliding window: reactions 30/min, chat 20/min) — both fail-open on Redis outage so engagement degrades gracefully
- [x] `ReactionBar` (player) + `ReactionRain` (host) components — `components/Games/ReactionBar/ReactionBar.tsx` sends via `useSendReactionMutation` with a 500ms client-side cooldown; `components/Games/ReactionRain/ReactionRain.tsx` reads `state.interactiveSession.liveReactions`, animates each burst with a CSS keyframe (3s upward drift) using a deterministic id-hash lateral offset, then dispatches `reactionConsumed` to drop the DOM node. Both mounted on `PlayPage` and gated on `session.settings.reactionsEnabled`.
- [x] `ChatPanel` (host + player) component with host moderation — `components/Games/ChatPanel/ChatPanel.tsx` seeds the slice from `useListChatQuery` once, then renders exclusively from `state.interactiveSession.chat` so STOMP `/chat` broadcasts (new sends + moderation flips) are live. Collapsible toggle button with message count, auto-scroll on new row, host messages styled distinctively (`fromHost` badge), host hover-Hide button calls `useModerateChatMutation`, non-hosts re-render moderated rows as `(hidden by host)` while hosts see the original crossed out so they can recover context.
- [x] Optimistic chat send + STOMP reconcile — `store/enhancements/chat.ts` patches every cached `listChat` page with a synthetic `tmp-{ts}-{nonce}` row on dispatch; on fulfill the canonical id replaces the placeholder, on reject the patch is undone. `optimisticModerateChat` patches `moderated=true` in place for the moderating host's own cache; the STOMP rebroadcast reconciles every other viewer via the slice's id-dedupe in `chatMessageReceived`.
- [x] Frontend codegen — generated hooks `useSendReactionMutation`, `useSendChatMutation`, `useListChatQuery`, `useModerateChatMutation` are in `BrainFlexApi.ts`; lint + typecheck clean
- [x] Backend tests pass — 244/244 including 8 new `InteractiveSessionServiceTest` cases for reactions (persist + broadcast, emoji rejection, settings gate, rate-limit) and chat (host flag, empty/oversize rejection, settings gate, moderation flip, non-host moderation forbidden)
