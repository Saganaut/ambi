# 001 — Observability & logging stack

**Status:** Accepted
**Date:** 2026-05-24

## Context

Ambi had effectively no logging strategy: unstructured backend console output with no
`traceId`/`userId` and swallowed exceptions, ad-hoc `console.*` on the frontend with no error
boundary or error reporting, and an aspirational stack in
[infrastructure.md](../infrastructure/infrastructure.md) that did not exist.

Constraints: early-stage and pre-revenue, so cost must stay minimal (free tiers, a few $/mo) and be
revisited as usage grows; production runs on AWS; and the frontend roadmap wants error tracking
now, Web Vitals and session replay later.

## Decision

A **hybrid** backbone: a vendor-agnostic foundation now, vendor SDKs deferred until they earn
their keep.

**Logs.** Structured **JSON to stdout** under the `prod` profile (`logback-spring.xml` wiring
`logstash-logback-encoder`); non-prod keeps the readable console. The **container log driver**
(awslogs on ECS / CloudWatch agent on EC2) ships stdout to **CloudWatch Logs** — the app makes no
CloudWatch API calls. Queried via Logs Insights.

**Correlation.** The frontend stamps every API call with an `X-Request-Id` (`emptyApi.ts`).
`MdcLoggingFilter` adopts it as the MDC `traceId` (minting one if absent), adds `userId` (the
principal name), and echoes it back on the response. Every log line and error body carries the same
id, so one id ties a user action to its server log lines, and later to its Sentry issue.

**Errors.** Backend error→HTTP mapping stays owned by the existing
[exception system](../features/exceptions.md) (`GlobalExceptionHandler`, RFC 9457 ProblemDetail),
which already reads `traceId` from the MDC — this work _feeds_ it rather than duplicating it. The
frontend gains a shared `logger` (`utils/logger.ts`), a root `ErrorBoundary`, window
`error`/`unhandledrejection` capture, and `hidden` source maps. **Sentry** (free tier, per-layer
DSNs) is the vendor for error tracking + Web Vitals + session replay, wired later via the marked
seam (`logger.ts` PROD SEAM).

**Metrics.** Actuator exposes `health,info,metrics`, with Micrometer publishing to
`micrometer-registry-cloudwatch2` in prod. A **LocalStack** container (scoped to `cloudwatch,logs`)
lets that path be exercised in dev; **Garage stays the S3 implementation**.

Current implementation status lives in
[Using the observability stack](../runbooks/using-the-observability-stack.md), not here.

## Consequences

- Log lines are correlated from day one (`traceId`/`userId` in the MDC, `X-Request-Id` echoed on
  every response).
- The foundation is vendor-neutral: adopting Sentry (or swapping it) touches `logger.ts`,
  `pom.xml`, and config — not call sites.
- stdout-+-log-driver keeps the app free of AWS coupling for logging and works identically on any
  host; the cost is that log _delivery_ is an infra concern validated at deploy time (LocalStack
  mitigates this locally).
- `userId` in logs is the principal name (DB-free, cheap), not the canonical Mongo id — good enough
  for correlation, refine if needed.

## Alternatives considered

- **Pure AWS-native** (CloudWatch Logs/Metrics/X-Ray + **CloudWatch RUM** for the frontend). One
  vendor, no third party — but weaker error-grouping UX, RUM bills per event, and replay is more
  limited than Sentry. Rejected for DX/cost on the frontend; CloudWatch is still the logs/metrics
  sink.
- **Vendor-neutral OpenTelemetry** (OTel SDKs → collector → swappable backend). Most portable, but
  the most upfront wiring for a small team at this stage. Deferred; `traceId` today, X-Ray/OTel
  optional later.
- **App-level CloudWatch Logs appender** instead of stdout + log driver. Rejected: couples the app
  to AWS and duplicates what the platform log driver does for free.

## Open questions

Not decided; pick one per item before the first real deploy and fold anything load-bearing back
into the Decision above.

- **Retention.** Leaning flat 30-day CloudWatch retention, no archival — volume is tiny, so cost is
  the window, not ingest. A hot window + S3 lifecycle export only pays off above 30-day history.
- **Querying.** Leaning Logs Insights with saved queries (by `traceId`, by `userId`, "5xx in the
  last hour") — zero extra infra. Grafana/Loki or a hosted SaaS is a revisit-if-painful option.
- **Alerting.** Leaning a metric filter on `level=ERROR`/5xx → Alarm → SNS email short-term; likely
  end state is Sentry owning error alerting, CloudWatch alarms kept for infra/health.
- **Sensitive-data policy** (decide before real traffic). Agree a never-log list (OAuth
  tokens/secrets, session cookies, full email addresses, raw bodies). `userId` in the MDC is the
  principal name (email-ish) — undecided whether to hash it or swap to the Mongo id, and whether
  the mechanism is a Logback masking converter or call-site discipline.
- **Levels per environment.** Confirm the prod root level (`INFO`), per-package overrides, and
  whether any high-traffic path needs sampling. Low priority at current scale.
- **Dev parity.** Whether a local Loki+Grafana earns its keep, or `tee`/`grep` over the
  (not-yet-functional) file log suffices.
