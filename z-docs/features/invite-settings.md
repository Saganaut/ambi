# Invite Settings (Sharing Preferences)

Deck-level configuration for where the join QR code and room code appear
during a live presentation, edited via the deck editor's "Sharing
preferences" drawer.

---

## Model

[`Settings.InviteSettings`](../../backend/src/main/java/com/cephadex/ambi/presentation/deck/Settings.java):

```java
public record InviteSettings(
    boolean showRoomCodeInHeader,
    boolean showJoinInfoInResults) {}
```

Defaults ([`DeckDefaultsProperties.Invite`](../../backend/src/main/java/com/cephadex/ambi/presentation/deck/config/DeckDefaultsProperties.java)):
`showRoomCodeInHeader = true`, `showJoinInfoInResults = false`.

Set via `PUT /api/decks/{id}/invite-settings`
([`DeckController`](../../backend/src/main/java/com/cephadex/ambi/presentation/deck/DeckController.java)),
same targeted-sub-document-update pattern as `pointSettings`/`answerSettings`/
`audienceSettings` (no deck `@Version` bump).

Two booleans, not a matrix: the lobby always shows join info (hiding it there
is a degenerate case), the header only ever offers the room code (a QR needs
real pixel size to scan, which a thin header strip can't give it), and the
full-screen results view gets one combined toggle for both codes.

## Where each flag is consumed

The deck's static invite settings are carried into a live session on the
one-time REST snapshot
([`SessionSnapshotResponse`](../../backend/src/main/java/com/cephadex/ambi/session/dto/SessionSnapshotResponse.java),
populated by
[`LiveSessionSnapshotService.getSnapshot`](../../backend/src/main/java/com/cephadex/ambi/session/LiveSessionSnapshotService.java))
and seeded into the frontend's `liveSessionSlice` read model. They're fixed at
deck-authoring time and never change during a run, so no STOMP `SessionEvent`
delta patches them.

- **Lobby** —
  [`BoardLobby`](../../frontend/src/features/liveSession/components/SessionBoard/stages/BoardLobby.tsx)
  always shows the shared
  [`JoinInfoDisplay`](../../frontend/src/features/liveSession/components/JoinInfoDisplay/JoinInfoDisplay.tsx)
  (QR + room code), unconditionally — not gated by any setting.
- **Header (all slides)** —
  [`SessionHeader`](../../frontend/src/features/liveSession/components/SessionHeader/SessionHeader.tsx)'s
  room-code line is gated on `showRoomCodeInHeader`.
- **Results screen** —
  [`BoardOverallResults`](../../frontend/src/features/liveSession/components/SessionBoard/stages/BoardOverallResults.tsx)
  renders `JoinInfoDisplay` (QR + room code) alongside the final standings,
  gated on `showJoinInfoInResults`.

## Settings UI

[`InviteSettingsPanel`](../../frontend/src/features/deck/components/DeckEditor/RightSidebar/InvitePanel/InviteSettingsPanel.tsx)
— two `Toggle`s (one per flag) plus a static line noting the lobby's fixed
behavior. Deck-wide only, no per-slide override; writes are debounced and
always PUT the complete `InviteSettings` object.
