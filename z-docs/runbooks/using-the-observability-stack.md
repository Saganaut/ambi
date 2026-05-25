<!--
  Runbook: how to use the BrainFlex observability foundation day-to-day —
  emitting correlated logs front and back, running prod-shaped JSON logging
  locally, reading the X-Request-Id ↔ traceId thread, and exercising the
  LocalStack CloudWatch path. The "why" lives in the ADR
  (z-docs/decisions/001-observability-stack.md); this file is the "how".
-->

# Using the observability stack

The architecture and the reasoning behind it are in **[ADR 001 — Observability & logging stack](../decisions/001-observability-stack.md)**. This runbook is the operational how-to: what to call, how to run it, and how to confirm a log line on the backend matches a request from the browser.

The one idea to hold onto: **every request carries an `X-Request-Id`**. The frontend mints it, the backend adopts it into the SLF4J MDC as `traceId`, and it shows up in log lines, error response bodies, and the `X-Request-Id` response header. That single id is how you tie a user click to a server-side stack trace.

---

## Backend: emitting logs

Keep the existing convention — a hand-rolled logger per class (we do **not** use `@Slf4j`):

```java
private static final Logger log = LoggerFactory.getLogger(MyService.class);
...
log.info("Deck published deckId={} elements={}", deckId, count);
```

You never set `traceId` or `userId` yourself — `MdcLoggingFilter` (`backend/.../web/MdcLoggingFilter.java`) has already put them in the MDC for the request, and `logback-spring.xml` emits them on every record. Just log a clear message with structured key=value context.

**Do not catch-and-swallow.** Let exceptions propagate to `GlobalExceptionHandler` (the single `@RestControllerAdvice`), which logs 5xx with the full stack trace + `traceId` and returns an RFC 9457 `ProblemDetail`. See [EXCEPTION-RULES](../rules/EXCEPTION-RULES.md).

### Run with dev (readable) logging

The normal way to bring up the whole stack — Docker, frontend, and backend — is:

```bash
./scripts/brainflex.sh        # run from the repo root; Ctrl+C stops everything
```

This already exports `dev.env` before launching the backend and boots the default
(non-`prod`) profile, so you get the familiar coloured console line with `[traceId]`
inserted — interleaved with the Vite frontend output in the same terminal. **No extra
steps are needed to get readable dev logs this way.**

To run **just the backend** (e.g. frontend already running elsewhere):

```bash
set -a && . ./dev.env && set +a   # see note below — required for placeholder resolution
cd backend && ./mvnw spring-boot:run
```

> The `set -a … dev.env … set +a` step is mandatory for a non-interactive boot — `brainflex.sh` does the equivalent in its backend subshell. `application.properties` binds `logging.level.org.springframework.security=${LOGGING_LEVEL}` very early — before `DotenvEnvironmentPostProcessor` adds its property source — so the placeholder must already be a real OS env var (`LOGGING_LEVEL` is set in `dev.env`) or startup fails with `Value: "${LOGGING_LEVEL}"`.

### Run with prod (JSON) logging locally

To see exactly what CloudWatch will ingest — one-line JSON on stdout with `traceId`/`userId` fields:

```bash
set -a && . ./dev.env && set +a
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=prod
```

In production nothing changes in the app: stdout is shipped to CloudWatch Logs by the container log driver (awslogs on ECS / the CloudWatch agent on EC2). The app makes **no** AWS calls to log.

### Persisting logs to a file (optional)

By default logs only stream to the terminal — nothing is written to disk. To **also** tee the backend logs to a file (handy for grepping by `traceId` after the fact), turn on the opt-in `filelog` Logback profile:

```bash
./scripts/brainflex.sh --file-logs        # or: -f
```

This keeps the normal console output **and** appends readable, non-coloured lines (with `[traceId]`) to `backend/logs/brainflex.log` — rolled daily and at 10 MB, 7 days / 100 MB retained, gzipped. The directory is git-ignored.

Running the backend directly, activate the same profile yourself (it stacks on top of dev or prod):

```bash
set -a && . ./dev.env && set +a
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=filelog
# override the path/name with LOG_FILE=/some/where/app.log
```

Then tail or grep it like any file:

```bash
tail -f backend/logs/brainflex.log
grep smoke-123 backend/logs/brainflex.log
```

The appender lives in the `filelog` block of `logback-spring.xml`; it is off unless the profile is active and never affects production behaviour.

---

## Frontend: emitting logs

Import the shared logger — never call `console.*` directly in new code:

```ts
import { logger } from "@/utils/logger";

logger.info("Deck saved", { deckId });
logger.error("Failed to load deck", { deckId, err });
```

- **Dev**: pretty, level-prefixed console output.
- **Prod**: quiet for `debug`/`info`/`warn`; `error` still hits `console.error`. The single Sentry seam is the `PROD SEAM` comment in `frontend/src/utils/logger.ts` — that one file is all that changes when Sentry lands.

You get error reporting for free in two places, so you rarely log errors by hand:

- **API failures** — `emptyApi.ts`'s `baseQueryWithAuthPrompt` logs every non-401 failure with the server `traceId` (read off the echoed `X-Request-Id` response header). 401s are an expected auth-prompt signal and are intentionally not logged as errors.
- **React render crashes** — the root `ErrorBoundary` (in `routes/__root.tsx`) logs and renders `ServerErrorPage` instead of a white screen. `window.onerror` / `unhandledrejection` are wired in `main.tsx`.

You normally only call `logger.*` directly for domain events and caught-and-handled conditions.

---

## Verifying the correlation thread end-to-end

1. **Server mints an id when none is sent**, and echoes it:

   ```bash
   curl -i http://localhost:8080/actuator/health | grep -i x-request-id
   # → X-Request-Id: 1b9f...   (a fresh UUID)
   ```

2. **Server honours a supplied id** — and the same id appears in the log line:

   ```bash
   curl -s -H "X-Request-Id: smoke-123" \
     http://localhost:8080/api/decks/000000000000000000000000
   # → {"detail":"Deck not found", ..., "traceId":"smoke-123"}
   ```

   In the backend console you'll see the matching line, e.g.
   `... [smoke-123] c.b...DeckController : ...`.

3. **From the browser**: open DevTools → Network, trigger any API call, and confirm the request's `X-Request-Id` header equals the response's `X-Request-Id`. Grep the backend logs for that id to find the server side of the same request.

---

## Health & metrics (Actuator)

Exposed endpoints are limited to `health,info,metrics` (`application.properties`), with health probes enabled:

```bash
curl -s http://localhost:8080/actuator/health      # {"status":"UP", ...}
curl -s http://localhost:8080/actuator/metrics      # list of metric names
curl -s http://localhost:8080/actuator/metrics/jvm.memory.used
```

The app-specific `/api/health` controller is separate and is what the frontend may probe.

---

## LocalStack — not used for logs (yet)

**LocalStack does nothing for logging.** It is pre-positioned for the *deferred metrics path* only. If you're working on logs, you can ignore this section entirely (and the `localstack` container that `./scripts/brainflex.sh` / `docker compose up -d` starts).

Why there's nothing to test here for logs: in production the path is **stdout → container log driver → CloudWatch Logs**. The app makes no AWS calls to log, so there is no CloudWatch log appender to emulate locally. The local equivalent of "what CloudWatch will ingest" is simply the **prod-profile JSON on stdout** shown above — not anything in LocalStack.

What LocalStack *is* for: once `micrometer-registry-cloudwatch2` is wired (deferred), published custom **metrics** can be inspected against the emulator without touching real AWS:

```bash
docker compose up -d localstack        # edge port :4566
export AWS_ENDPOINT_URL=http://localhost:4566 AWS_REGION=us-east-1   # already in dev.env
awslocal cloudwatch list-metrics       # or: aws --endpoint-url=$AWS_ENDPOINT_URL cloudwatch list-metrics
```

Garage stays our S3 — LocalStack is scoped to `cloudwatch,logs` only and does not replace it.

---

## Log lifecycle & operations — TBD

> **Status: not yet decided.** The *foundation* — structured JSON, end-to-end `traceId` correlation, and the CloudWatch Logs sink (stdout → log driver) — is settled in [ADR 001](../decisions/001-observability-stack.md). What's still open is what we actually **do** with the logs once they land in CloudWatch. The options below are proposals, not decisions; pick one per item before the first real deploy and promote anything load-bearing into the ADR.

### 1. Retention & archival

Volume is tiny (a learning project), so cost is dominated by the retention window, not ingest.

- **A — flat 30-day retention, no archival (leaning).** Set the log group's retention to 30 days; let it expire. Simplest, costs cents/month at our volume.
- **B — short hot window + S3 archive.** ~14 days hot in CloudWatch, lifecycle-export older logs to S3 (Standard-IA → Glacier). Cheaper long-term keep, more moving parts — only worth it if we ever need >30-day history.
- **C — never expire.** Avoid: unbounded cost for no benefit here.

### 2. Querying & dashboards

- **A — CloudWatch Logs Insights + saved queries (leaning).** Keep a small set of saved queries: by `traceId`, by `userId`, "5xx in the last hour". Zero extra infra.
- **B — ship to Grafana/Loki or a hosted SaaS** (Better Stack / Axiom / Grafana Cloud free tier) for nicer search and dashboards. Revisit only if the Insights UX or cost becomes painful.

### 3. Alerting

- **A — CloudWatch metric filter → Alarm → SNS email (leaning short-term).** Metric filter on `level=ERROR` / 5xx count, alarm to an SNS topic. Native, near-free.
- **B — Sentry for error alerts, CloudWatch for ops.** Once the deferred Sentry seam is wired, let Sentry own error-event alerting (grouping, rates) and keep CloudWatch alarms for infra/health only. Likely the end state.

### 4. Sensitive-data policy (decide before any real traffic)

- Agree an explicit **never-log** list: OAuth tokens/secrets, session cookies, full email addresses, raw request/response bodies.
- `userId` in the MDC is currently the principal **name** (email-ish), not the Mongo id — **TBD** whether to hash it or swap to the canonical id to keep PII out of logs (ADR 001 flags this as "refine if needed").
- **TBD** the mechanism: a Logback masking converter vs. discipline at call sites.

### 5. Levels & volume per environment

- **TBD:** confirm the prod root level (`INFO`) and any per-package overrides, and whether a high-traffic path ever needs sampling or DEBUG-gating. Low priority at current scale.

### 6. Local / dev parity

- File logging is now opt-in (`./scripts/brainflex.sh -f`, above). **TBD** whether to add a local Loki+Grafana for dashboard parity in dev, or just keep `tee` / `grep` on the file. Only worth it if we adopt option 2-B.

---

## Deferred — where the vendor seams are

These are intentionally **not** wired yet (see the ADR's deferred section). When you pick them up:

| To add | Edit |
| --- | --- |
| Sentry error tracking + Web Vitals + session replay (frontend) | the `PROD SEAM` in `frontend/src/utils/logger.ts`; add `@sentry/react` |
| Sentry (backend) | `backend/pom.xml` (commented intent next to the logstash encoder) + init in config |
| CloudWatch custom metrics | `backend/pom.xml` → `micrometer-registry-cloudwatch2`; validate against LocalStack |
| X-Ray / OpenTelemetry tracing | propagate into the same `traceId` MDC key |
