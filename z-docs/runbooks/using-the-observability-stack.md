<!--
  Runbook: how to use the Ambi observability foundation day-to-day —
  emitting correlated logs front and back, reading the X-Request-Id ↔ traceId
  thread, and exercising the LocalStack CloudWatch path. The "why" lives in
  the ADR (z-docs/decisions/001-observability-stack.md); this file is the
  "how".
-->

# Using the observability stack

The architecture and the reasoning behind it are in **[ADR 001 — Observability & logging stack](../decisions/001-observability-stack.md)**. This runbook is the operational how-to: what to call, how to run it, and how to confirm a log line on the backend matches a request from the browser.

> **Status check:** structured JSON logging (`logback-spring.xml` +
> `logstash-logback-encoder`) described in some sections below is **planned,
> not implemented** — there is no `logback-spring.xml` in the repo, and the
> app runs on Spring Boot's default console logging in every profile today.
> What _is_ live: `MdcLoggingFilter`'s `traceId`/`userId` MDC correlation, the
> `X-Request-Id` echo, and the RFC 9457 `ProblemDetail` error path. The
> sections below are marked accordingly.

The one idea to hold onto: **every request carries an `X-Request-Id`**. The frontend mints it, the backend adopts it into the SLF4J MDC as `traceId`, and it shows up in log lines, error response bodies, and the `X-Request-Id` response header. That single id is how you tie a user click to a server-side stack trace.

---

## Backend: emitting logs

Keep the existing convention — a hand-rolled logger per class (we do **not** use `@Slf4j`):

```java
private static final Logger log = LoggerFactory.getLogger(MyService.class);
...
log.info("Deck published deckId={} elements={}", deckId, count);
```

You never set `traceId` or `userId` yourself — `MdcLoggingFilter` (`backend/.../config/MdcLoggingFilter.java`) has already put them in the MDC for the request. Note that today's default console pattern does **not** print MDC values automatically (that needs either a custom Logback pattern/encoder or `micrometer-tracing` on the classpath, neither of which is present yet) — `traceId`/`userId` are reliably visible today via `GlobalExceptionHandler`'s error response body and the `X-Request-Id` response header, not via bracketed console text. Just log a clear message with structured key=value context.

**Do not catch-and-swallow.** Let exceptions propagate to `GlobalExceptionHandler` (the single `@RestControllerAdvice`), which logs 5xx with the full stack trace + `traceId` and returns an RFC 9457 `ProblemDetail`. See [exception-rules](../rules/exception-rules.md).

### Run with dev (readable) logging

The normal way to bring up the whole stack — Docker, frontend, and backend — is:

```bash
./scripts/ambi.sh        # run from the repo root; Ctrl+C stops everything
```

This already exports `dev.env` before launching the backend and boots the default
(non-`prod`) profile, interleaved with the Vite frontend output in the same
terminal. **No extra steps are needed to get dev logs this way** — you get
Spring Boot's default console output, with `traceId`/`userId` available in the
MDC for any log statement that references them explicitly.

To run **just the backend** (e.g. frontend already running elsewhere):

```bash
set -a && . ./dev.env && set +a   # see note below — required for placeholder resolution
cd backend && ./mvnw spring-boot:run
```

> The `set -a … dev.env … set +a` step is mandatory for a non-interactive boot — `ambi.sh` does the equivalent in its backend subshell. There is no in-app dotenv loader: `dev.env` reaches Spring only because the shell exports it into the process environment first. This matters if you add a `${...}` placeholder to `application.properties` in future work — today's properties don't have any unresolved ones tied to `dev.env` values that would fail startup (`dev.env` does set `LOGGING_LEVEL_ROOT`, but no property currently binds to it).

### Structured JSON / prod-shaped logging locally — planned, not implemented

The ADR's target state is one-line JSON on stdout under the `prod` profile
(`logback-spring.xml` + `logstash-logback-encoder`), so you can see locally
exactly what CloudWatch will ingest. **This does not exist yet** — there is no
`logback-spring.xml` in the repo, so running with `-Dspring-boot.run.profiles=prod`
today only applies `application-PROD.properties` (disables Swagger UI); logging
output is unchanged from the default profile. Revisit this section once the
Logback config lands.

### Persisting logs to a file — planned, not implemented

The intent is an opt-in `filelog` Logback profile that also tees output to
`backend/logs/ambi.log` (rolled, retained, gzipped), toggled via
`./scripts/ambi.sh --file-logs` / `-f`. The script flag exists today and sets
`SPRING_PROFILES_ACTIVE=filelog`, but since there is no `logback-spring.xml`
to interpret that profile, activating it currently has **no effect** — no file
is written. This will start working once the Logback config (with its
`filelog` appender block) is added.

---

## Frontend: emitting logs

Import the shared logger — never call `console.*` directly in new code:

```ts
import { logger } from "@/shared/utils/logger";

logger.info("Deck saved", { deckId });
logger.error("Failed to load deck", { deckId, err });
```

- **Dev**: pretty, level-prefixed console output.
- **Prod**: quiet for `debug`/`info`/`warn`; `error` still hits `console.error`. The single Sentry seam is the `PROD SEAM` comment in `frontend/src/shared/utils/logger.ts` — that one file is all that changes when Sentry lands.

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

   `smoke-123` is the same id echoed back on the `X-Request-Id` response
   header — that's the thread to grep the MDC/logs by once structured logging
   lands (see the status note above; today's default console pattern doesn't
   print MDC values, so there is no bracketed `[smoke-123]` console line yet).

3. **From the browser**: open DevTools → Network, trigger any API call, and confirm the request's `X-Request-Id` header equals the response's `X-Request-Id`. Grep the backend logs for that id to find the server side of the same request.

---

## Health & metrics (Actuator)

Only the `health` endpoint is exposed today — there is no `management.*`
config anywhere, so Spring Boot's default (health-only) exposure applies. Only
`/actuator/health/**` is `permitAll` in `SecurityConfig`; every other
`/actuator/**` path (including `/actuator/metrics`) requires authentication
and returns `401` if you're not logged in:

```bash
curl -s http://localhost:8080/actuator/health      # {"status":"UP", ...}
curl -s http://localhost:8080/actuator/metrics      # 401 Unauthorized — not exposed/permitted
```

`info` and `metrics` exposure, plus Micrometer → CloudWatch publishing, are
planned (see ADR 001) but not wired up.

The app-specific `/api/health` controller is separate and is what the frontend may probe.

---

## LocalStack — not used for logs (yet)

**LocalStack does nothing for logging.** It is pre-positioned for the _deferred metrics path_ only. If you're working on logs, you can ignore this section entirely (and the `localstack` container that `./scripts/ambi.sh` / `docker compose up -d` starts).

Why there's nothing to test here for logs: in production the path would be **stdout → container log driver → CloudWatch Logs**. The app makes no AWS calls to log, so there is no CloudWatch log appender to emulate locally. Once structured logging is implemented, the local equivalent of "what CloudWatch will ingest" will simply be the prod-profile JSON on stdout (see the planned section above) — not anything in LocalStack.

What LocalStack _is_ for: once `micrometer-registry-cloudwatch2` is wired (deferred), published custom **metrics** can be inspected against the emulator without touching real AWS:

```bash
docker compose up -d localstack        # edge port :4566
export AWS_ENDPOINT_URL=http://localhost:4566 AWS_REGION=us-east-1   # AWS_ENDPOINT_URL is already in dev.env; AWS_REGION is not (see example.env)
awslocal cloudwatch list-metrics       # or: aws --endpoint-url=$AWS_ENDPOINT_URL cloudwatch list-metrics
```

Garage stays our S3 — LocalStack is scoped to `cloudwatch,logs` only and does not replace it.

---

## Log lifecycle & operations — TBD

> **Status: not yet decided.** The _design_ — structured JSON, end-to-end `traceId` correlation, and the CloudWatch Logs sink (stdout → log driver) — is settled in [ADR 001](../decisions/001-observability-stack.md), though structured JSON output itself is still planned (see the status note at the top of this runbook); `traceId` correlation is already live. What's still open is what we actually **do** with the logs once they land in CloudWatch. The options below are proposals, not decisions; pick one per item before the first real deploy and promote anything load-bearing into the ADR.

### 1. Retention & archival

Volume is tiny at our current early-stage, pre-revenue scale, so cost is dominated by the retention window, not ingest.

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

- File logging is planned as opt-in (`./scripts/ambi.sh -f`, above) but not yet functional — see the status note above. **TBD** whether to add a local Loki+Grafana for dashboard parity in dev, or just keep `tee` / `grep` on the file once it works. Only worth it if we adopt option 2-B.

---

## Deferred — where the vendor seams are

These are intentionally **not** wired yet (see the ADR's deferred section). When you pick them up:

| To add                                                         | Edit                                                                                              |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Structured JSON logging                                        | add `backend/src/main/resources/logback-spring.xml` wiring the already-present `logstash-logback-encoder` dependency |
| Sentry error tracking + Web Vitals + session replay (frontend) | the `PROD SEAM` in `frontend/src/shared/utils/logger.ts`; add `@sentry/react`                      |
| Sentry (backend)                                               | add the `sentry-spring-boot-starter` dependency to `backend/pom.xml` (not present, not even commented, today) + init in config |
| CloudWatch custom metrics                                      | add `management.*` exposure config + `micrometer-registry-cloudwatch2` to `backend/pom.xml` (not present today); validate against LocalStack |
| X-Ray / OpenTelemetry tracing                                  | propagate into the same `traceId` MDC key                                                          |
