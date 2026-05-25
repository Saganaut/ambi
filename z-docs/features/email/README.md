# Email

Outbound email for BrainFlex — transactional (welcome, invites, password reset,
account close), system (admin alerts), and marketing (announcements, digests).

This doc is a **design sketch**, not a record of what's built. The current code
under `service/EmailService.java` is the v0 scope — synchronous, fire-and-log,
method-per-template, wired only to scheduled-session invites. This document
proposes the v1 module so that:

1. New email categories (welcome, account-close, marketing) can be added
   without growing the `EmailService` interface.
2. Sends move off the request thread.
3. The dispatch worker can be **extracted to AWS Lambda + SQS** when we deploy
   to production, without touching any call site.

## Related

- [Auth](../auth/README.md) — welcome / account-close hook into the auth
  lifecycle.
- [Games](../games/README.md) — scheduled-session invite flow (current v0
  caller).

---

## Goals

- **Single publish API.** Every caller does `emailService.enqueue(job)`. They
  never construct MIME, never know the provider, never block on SMTP.
- **Provider-agnostic dispatch.** SMTP today, SES tomorrow, SendGrid for
  marketing if we split it — selectable by category.
- **Persisted outbox.** Every send is a row in Mongo first, dispatched second.
  Gives us retry, idempotency, an audit trail, and (critically) a swap point:
  the worker can become a Lambda reading from SQS without the call sites
  noticing.
- **Categories with different rules.** Transactional must never be
  suppression-filtered (legal/operational); marketing must be.

## Non-goals (for v1)

- Inbound email parsing.
- Live bounce/complaint webhook handling (SES does this; we'll add when we
  cut over).
- Per-user timezone formatting in email bodies (tracked separately —
  scheduled-session chunks).

---

## Current state (v0)

```
service/
├── EmailService.java         # interface: sendInitialInvite / sendBootReminder / sendCancelNotice
├── SmtpEmailService.java     # @ConditionalOnProperty(spring.mail.host) — JavaMailSender + Thymeleaf
└── NoOpEmailService.java     # fallback when spring.mail.host is unset
resources/templates/email/
├── initial-invite.html
├── boot-reminder.html
└── cancel-notice.html
```

Limitations driving the rewrite:

- **Method-per-template.** Every new email type grows the interface and forces
  call sites to depend on `ScheduledInteractiveSession` / `InteractiveSessionInvite`
  shapes that have nothing to do with email semantics.
- **Synchronous.** Send happens on the request thread. SMTP latency leaks into
  HTTP response times; the scheduler cron blocks per invitee.
- **No retry.** A single SMTP blip = a dropped invite, logged at WARN.
- **No suppression / unsubscribe.** Fine for invites; illegal for marketing
  (CAN-SPAM, CASL, GDPR).
- **No category routing.** All sends go through one provider. We can't route
  marketing to SendGrid/Postmark while keeping transactional on SES.

---

## Proposed module layout (v1)

```
service/email/
├── EmailService.java                # public API: enqueue(EmailJob) — the only thing callers see
├── EmailJob.java                    # value object: recipient, template, category, model, scheduledFor?
├── EmailCategory.java               # enum: TRANSACTIONAL | SYSTEM | MARKETING
├── EmailTemplate.java               # enum: WELCOME, INVITE_INITIAL, INVITE_REMINDER, INVITE_CANCEL,
│                                    #       ACCOUNT_CLOSED, PASSWORD_RESET, MARKETING_ANNOUNCE, ...
├── EmailTemplateRenderer.java       # Thymeleaf wrapper — takes (template, model) → (subject, htmlBody)
├── EmailDispatcher.java             # internal: pull from outbox → render → provider.send → mark
├── EmailSuppressionService.java     # is this recipient/category suppressed?
├── provider/
│   ├── EmailProvider.java           # interface: send(RenderedEmail) — the swap point
│   ├── SmtpEmailProvider.java       # current SmtpEmailService logic, repackaged
│   ├── NoOpEmailProvider.java
│   └── SesEmailProvider.java        # (future) AWS SDK v2 SES client
└── outbox/
    ├── EmailOutboxEntry.java        # @Document — see schema below
    ├── EmailOutboxRepository.java
    └── EmailOutboxWorker.java       # @Scheduled poller; replaceable with SQS publisher

model/
└── EmailSuppression.java            # @Document — unsubscribed addresses, per category
```

### Public API

```java
public interface EmailService {
    /** Enqueue a job for asynchronous dispatch. Never throws on provider failure. */
    String enqueue(EmailJob job);

    /** Convenience: enqueue and return immediately. Same as enqueue() but void. */
    default void send(EmailJob job) { enqueue(job); }
}

public record EmailJob(
        String recipient,            // email address
        String userId,               // optional — used for suppression + auditing
        EmailCategory category,
        EmailTemplate template,
        Map<String, Object> model,   // Thymeleaf vars
        Instant scheduledFor         // null = "now"
) {
    public static Builder builder() { ... }
}
```

Call site (replaces `emailService.sendInitialInvite(schedule, invite, host, deck)`):

```java
emailService.enqueue(EmailJob.builder()
    .recipient(invite.getEmail())
    .category(EmailCategory.TRANSACTIONAL)
    .template(EmailTemplate.INVITE_INITIAL)
    .model(Map.of(
        "hostName", hostName,
        "deckName", deck.getName(),
        "scheduledFor", schedule.getScheduledStartAt(),
        "acceptUrl", frontendBaseUrl + "/invite/" + invite.getInviteToken()))
    .build());
```

### Outbox document

```java
@Document("emailOutbox")
public class EmailOutboxEntry {
    @Id String id;
    String recipient;
    String userId;                 // nullable
    EmailCategory category;
    EmailTemplate template;
    Map<String, Object> model;
    Status status;                 // PENDING | CLAIMED | SENT | FAILED | SUPPRESSED
    int attempts;
    String lastError;              // nullable
    Instant scheduledFor;          // for delayed sends; defaults to createdAt
    Instant createdAt;
    Instant claimedAt;             // for worker lease — see Concurrency below
    Instant sentAt;                // nullable
}
```

Indexes:

- `{ status: 1, scheduledFor: 1 }` — worker poll query.
- `{ recipient: 1, createdAt: -1 }` — debugging / per-recipient history.
- TTL on `sentAt` (e.g. 90 days) to keep the collection bounded. Failures
  stay indefinitely for review.

### Suppression

```java
@Document("emailSuppression")
public class EmailSuppression {
    @Id String id;
    String emailLower;          // unique-indexed
    Set<EmailCategory> blocked; // MARKETING is the common case
    String reason;              // UNSUBSCRIBE | BOUNCE | COMPLAINT | MANUAL
    Instant createdAt;
}
```

`EmailDispatcher` checks suppression before dispatch and marks the entry
`SUPPRESSED` (not `SENT`, not `FAILED`) so the audit trail is honest.
**`TRANSACTIONAL` and `SYSTEM` ignore suppression** — you can't opt out of
your own password reset.

---

## Flow

```mermaid
sequenceDiagram
    participant Caller as Caller (controller/service)
    participant Service as EmailService
    participant Outbox as Mongo: emailOutbox
    participant Worker as EmailOutboxWorker
    participant Provider as EmailProvider (SMTP/SES)

    Caller->>Service: enqueue(job)
    Service->>Outbox: insert(status=PENDING)
    Service-->>Caller: return id (immediately)

    loop every N seconds (or SQS-driven in prod)
        Worker->>Outbox: claim batch (status=PENDING, scheduledFor<=now)
        Outbox-->>Worker: entries (status=CLAIMED)
        Worker->>Worker: render template
        Worker->>Provider: send(rendered)
        alt success
            Provider-->>Worker: ok
            Worker->>Outbox: mark SENT
        else failure
            Provider-->>Worker: error
            Worker->>Outbox: increment attempts; SENT or FAILED depending on max
        end
    end
```

### Concurrency

A single Spring instance is fine for v0/v1 — `@Scheduled` poll with a Mongo
`findAndModify` to atomically claim a batch (`status=PENDING → CLAIMED` with
`claimedAt=now`). Reclaim stuck `CLAIMED` rows older than ~5 min as a safety
net. When we run more than one backend instance we get free horizontal
scaling because claims are atomic per-document.

### Retry policy

- Transient (SMTP timeout, 4xx provider): exponential backoff,
  `scheduledFor = now + min(2^attempts, 60min)`, cap at 5 attempts → `FAILED`.
- Permanent (5xx provider, invalid recipient, bounce): immediate `FAILED`,
  add to suppression with `reason=BOUNCE` if category=MARKETING.

---

## Categories — the routing table

| Category        | Examples                              | Suppression-filtered? | Provider (planned)        | Unsubscribe link required? |
| --------------- | ------------------------------------- | --------------------- | ------------------------- | -------------------------- |
| `TRANSACTIONAL` | Welcome, invites, password reset      | No                    | SES                       | No                         |
| `SYSTEM`        | Admin alerts, account-close confirms  | No                    | SES                       | No                         |
| `MARKETING`     | Announcements, digests, win-back      | Yes                   | SES *(or SendGrid later)* | Yes (template-enforced)    |

The provider mapping lives in `EmailDispatcher` as a `Map<EmailCategory,
EmailProvider>`. Adding a second provider is configuration, not a code
change at the call site.

---

## The Lambda + SQS swap

The whole point of the outbox is that **`EmailOutboxWorker` is replaceable
without touching anything else**. Two viable paths when we deploy to AWS:

**Option A — SQS-fronted outbox (recommended)**

1. `EmailService.enqueue` still writes to Mongo outbox (durable record), then
   publishes the entry id to SQS.
2. Lambda triggers on SQS, reads the entry by id, dispatches via SES, marks
   the row.
3. Mongo remains the source of truth; SQS is just the notification.

**Option B — Pure SQS**

1. `EmailService.enqueue` skips Mongo and publishes the whole job to SQS.
2. Lambda dispatches via SES.
3. Audit trail lives in SES + CloudWatch + a separate "send log" table if we
   want history.

Option A is cheaper to reason about (one source of truth, retry logic stays
familiar, history is queryable) and matches the v1 module shape — we'd add
an `SqsOutboxNotifier` that the local worker simply ignores. Option B is
"more cloud-native" but loses our easy local dev story (you can't run the
worker locally against the same data shape).

We'll commit to a path when [a deployment ADR](../../decisions/README.md) is
written; the v1 code should not assume either.

---

## Migration plan from v0

1. **New package, no breakage.** Create `service/email/` with the new
   interfaces. Leave `EmailService.java` (old) in place.
2. **Implement `SmtpEmailProvider`** by lifting the body of
   `SmtpEmailService.send(...)` verbatim.
3. **Implement `EmailOutboxWorker`** with a 2-second poll interval and
   single-instance claim.
4. **Port the 3 existing templates** to use the new template enum + renderer
   (no HTML changes needed).
5. **Switch `ScheduledInteractiveSessionService`** to call the new
   `EmailService.enqueue(...)`.
6. **Delete** the old `EmailService` / `SmtpEmailService` / `NoOpEmailService`.
7. **Add welcome email** as the first new category — wired off
   `UserService.register` (or wherever the registered-user transition lives;
   see [auth feature](../auth/README.md)).

Welcome and account-close are good first additions because they exercise the
template registry without touching the scheduled-session flow.

---

## Implementation checklist

- [ ] Create `service/email/` package and split files per the layout above.
- [ ] Add `EmailOutboxEntry` model + repository + indexes.
- [ ] Add `EmailSuppression` model + repository.
- [ ] Build `EmailTemplateRenderer` (subject + body resolution per template).
- [ ] Build `EmailDispatcher` with category → provider routing.
- [ ] Build `EmailOutboxWorker` (`@Scheduled` poll, atomic claim, retry, TTL).
- [ ] Port `SmtpEmailProvider` and `NoOpEmailProvider`.
- [ ] Migrate the 3 invite templates to the new enum.
- [ ] Migrate `ScheduledInteractiveSessionService` call sites.
- [ ] Delete v0 `EmailService` / `SmtpEmailService` / `NoOpEmailService`.
- [ ] Add `WELCOME` template + hook from registration.
- [ ] Add `ACCOUNT_CLOSED` template + hook from account-close flow.
- [ ] Add `MARKETING` category + unsubscribe link rendering + `/unsubscribe/{token}`
      endpoint that writes to `EmailSuppression`.
- [ ] Tests:
  - [ ] Unit: dispatcher honours suppression for MARKETING, ignores it for
        TRANSACTIONAL/SYSTEM.
  - [ ] Unit: worker claim is atomic (two workers can't grab the same row).
  - [ ] Unit: retry backoff schedule.
  - [ ] Integration: end-to-end enqueue → render → NoOp provider → SENT.
- [ ] ADR for deploy-time provider choice (SES vs SendGrid for marketing).
- [ ] Runbook for suppression-table operations (manual unsubscribe, bounce
      ingestion when SES webhooks land).

---

## Open questions

- **Templating language.** Sticking with Thymeleaf for parity with v0. If we
  add MJML for responsive HTML later, that's a renderer-internal change.
- **Sender identity.** One `From` address per category, or one per product
  surface? Decision deferred until SES setup.
- **Bounce/complaint ingestion.** Out of scope for v1; will need an SNS
  webhook endpoint once we're on SES.
- **Test-mode capture.** Should integration tests assert against the outbox
  collection or against a `CapturingEmailProvider`? The latter feels more
  faithful — propose adding it alongside `NoOpEmailProvider`.
