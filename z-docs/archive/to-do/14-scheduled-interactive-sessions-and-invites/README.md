# 14 — Scheduled interactive sessions & invites

**Status:** Shipped — backend models + service + cron sweep + REST + tests; frontend schedule modal + `/scheduled` list + `/invite/$token` redemption flow
**Depends on:** Nothing strict; chunk 18 (notifications) integrates nicely
**Unblocks:** Future "recurring class" features

## Scope

Two complementary features:

1. **Scheduled interactive sessions** — host picks a future date/time; the system boots a InteractiveSession at that time and notifies invitees.
2. **Invites** — host invites specific people by email; they get a single-use token to join.

This adds the first dependency on outbound email. Use a thin abstraction (`EmailService` interface) so the implementation can be SMTP today and SendGrid/Postmark later.

## New models

```text
ScheduledInteractiveSession                      @Document("scheduled_interactive_sessions")
  @Id String id
  String hostUserId, deckId
  InteractiveSessionSettings settings            // copied to the live InteractiveSession at boot time
  LocalDateTime scheduledStartAt
  LocalDateTime scheduledEndAt         // estimate — for calendar exports
  String reminderEmailTemplate         // nullable — host-customized reminder copy
  List<String> invitedEmails           // raw emails; resolved into InteractiveSessionInvite rows on create
  String createdInteractiveSessionId             // null until the show boots
  ScheduleStatus status                // SCHEDULED | LIVE | COMPLETED | CANCELLED
  LocalDateTime createdAt, updatedAt
```

```text
InteractiveSessionInvite                         @Document("interactive_session_invites")
  @Id String id
  @Indexed String interactiveSessionId           // null until parent ScheduledInteractiveSession boots
  @Indexed String scheduledInteractiveSessionId  // points back at the parent if scheduled
  String email                         // case-normalized
  String invitedByUserId
  @Indexed(unique=true) String inviteToken  // single-use, ~24 bytes base64url
  String resolvedUserId                // populated when the invitee logs in / accepts
  LocalDateTime sentAt
  LocalDateTime redeemedAt             // when the invitee actually joined
  LocalDateTime expiresAt              // default = scheduledStartAt + 2h
```

```text
ScheduleStatus (enum)
  SCHEDULED, LIVE, COMPLETED, CANCELLED
```

Indexes:

- `ScheduledInteractiveSession`: `(status, scheduledStartAt)` — for the cron sweep
- `InteractiveSessionInvite`: `(email, scheduledInteractiveSessionId)` to dedupe

## Backend changes

- New `EmailService` interface + `SmtpEmailService` impl using Spring Boot's `JavaMailSender` (already on the classpath via Spring starters). Inject SMTP credentials via env vars; ship sane defaults.
- New `ScheduledInteractiveSessionService`:
  - `schedule(hostUserId, deckId, scheduledStartAt, settings, invitedEmails)` — create rows + send initial invite emails
  - `cancel(scheduledInteractiveSessionId, hostUserId)` — sets `status = CANCELLED`, voids invites
  - `boot(scheduledInteractiveSessionId)` — creates the live InteractiveSession, copies settings, sets `createdInteractiveSessionId`, transitions to `LIVE`, sends reminder emails with the join link
  - `complete(scheduledInteractiveSessionId)` — called when the live InteractiveSession transitions to `FINISHED`
- Spring `@Scheduled` cron sweep (every 30s): pick up `ScheduledInteractiveSession` rows with `status=SCHEDULED && scheduledStartAt <= now`, boot them
- Endpoints:
  - `GET    /api/scheduled-interactive-sessions/mine`
  - `GET    /api/scheduled-interactive-sessions/{id}`
  - `POST   /api/scheduled-interactive-sessions` — body `{ deckId, scheduledStartAt, settings, invitedEmails[] }`
  - `PUT    /api/scheduled-interactive-sessions/{id}` — host edits before boot
  - `POST   /api/scheduled-interactive-sessions/{id}/cancel`
  - `POST   /api/scheduled-interactive-sessions/{id}/invite` — body `{ email }` (add later)
  - `POST   /api/invites/{token}/redeem` — invitee hits this from email link; if user is logged in, marks redeemed and returns the joinable interactive session URL
- Add `String inviteCode` (existing on InteractiveSession, called `inviteToken`) usable for ad-hoc shares too

## Email templates

Two transactional templates:

- **Initial invite** — sent on schedule creation. Subject: "{HostName} invited you to play {DeckName}". Body has scheduled time + Add to Calendar (ICS attachment).
- **Reminder / boot** — sent when the show boots. Subject: "{DeckName} is starting now". Body has a one-tap join link with `inviteToken`.

Use plain Thymeleaf templates under `backend/src/main/resources/templates/email/`.

## Frontend changes

- Deck detail page gains a "Schedule" button → opens scheduling modal
- Modal:
  - Date/time picker (use a lightweight library — `react-day-picker` is already in many React stacks)
  - Settings preview (read-only summary of the interactive session settings the deck will use)
  - Invite email tagged-input (chip per email)
- New `/scheduled` route — host's list of upcoming + past scheduled interactive sessions
- Invite redemption: a new `/invite/$token` route that calls the redeem endpoint and routes the user into the lobby

## Cross-cutting concerns

- Time zones: store everything in UTC; render in the host's local TZ. Host's TZ comes from `User.timezone` (chunk 20).
- Don't email more than once per (email, scheduledInteractiveSession) pair without an explicit "Resend" action.
- Invites resolve to a `userId` lazily — if the invitee isn't registered when they click the link, route through registration with `returnUrl = /invite/{token}`.

## Checklist

- [x] `ScheduledInteractiveSession` + `InteractiveSessionInvite` models + repos + indexes
- [x] `ScheduleStatus` enum
- [x] `EmailService` interface + SMTP impl
- [x] Email templates (Thymeleaf)
- [x] `ScheduledInteractiveSessionService` schedule/cancel/boot/complete
- [x] `@Scheduled` cron sweep
- [x] Endpoints + tests (mock `EmailService` in tests)
- [x] Invite redeem flow + `/invite/$token` route
- [x] Schedule modal on deck detail page
- [x] `/scheduled` host list page
- [x] Frontend codegen + lint
- [x] Backend tests pass

## Implementation notes

- Settings UI is read-only-from-deck in v1: the schedule modal does not let
  the host override session settings inline. The schedule inherits the deck's
  `defaultSettings` at boot time. The `PUT /api/scheduled-interactive-sessions/{id}`
  endpoint accepts a settings override but no UI binds to it yet — finish-work
  for a later pass.
- `EmailService` has two implementations selected by `spring.mail.host`:
  `SmtpEmailService` (Thymeleaf-rendered HTML through `JavaMailSender`) and
  `NoOpEmailService` (logs at DEBUG, used in tests + local dev without an SMTP
  relay). Templates live in `backend/src/main/resources/templates/email/`.
- `InteractiveSessionEndedEvent` + `InteractiveSessionEndedListener` decouple
  the live-session lifecycle from the schedule lifecycle. When a session
  reaches `FINISHED`, `InteractiveSessionService` publishes the event and the
  listener marks the parent `ScheduledInteractiveSession` `COMPLETED`.
- Cron sweep runs every 30s with `fixedDelay = 30_000`. Compound index on
  `(status, scheduledStartAt)` keeps the per-tick query cheap.
- Invite tokens are 24-byte random, base64url-encoded, looked up via the
  unique `inviteToken` index. Default expiry = `scheduledStartAt + 2h`.

## Deferred

- ICS calendar attachment in the initial invite email — body has the time
  but no `.ics` attachment yet. The email templates are minimal HTML; revisit
  alongside chunk 18 (notifications) once an iCal builder is on the
  classpath.
- "Resend invite" UI affordance — the backend has the endpoint shape (the
  `POST /{id}/invite` accepts the same email and creates the row idempotently)
  but the `/scheduled` list page doesn't surface it yet.
