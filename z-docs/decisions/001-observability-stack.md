# 001 — Observability & logging stack

**Status:** Accepted (rationale reworded July 2026 to match the current product
identity — see [about-project-draft-07-2026.md](../about-project-draft-07-2026.md))
**Date:** 2026-05-24

## Context

Ambi had effectively no logging strategy. The backend used Spring Boot's
default unstructured console output (16 of ~347 files logged anything), with no
`traceId`, no `userId`, and exceptions mostly swallowed with
`log.warn(e.getMessage())`. The frontend had ~57 ad-hoc `console.*` calls, no
error boundary (a render throw blanked the screen), and no error reporting.
[infrastructure.md](../infrastructure/infrastructure.md) documented an
aspirational stack (Sentry + Logstash JSON + CloudWatch) but none of it existed,
and there was no way to exercise any AWS path locally.

Constraints: Ambi is an early-stage, pre-revenue product with a small
deployment footprint, so cost must stay minimal (free tiers, a few $/mo at
most) — the right trade-off for now, to be revisited as usage grows;
production will run on AWS (EC2 + SQS/SNS/Lambda + S3 + ElastiCache per
infrastructure.md); and the frontend roadmap wants error tracking now, Web
Vitals and session replay later.

## Decision

A **hybrid** backbone, built in a vendor-agnostic foundation now with the vendor
SDKs deferred until they earn their keep.

**Logs.** _Planned:_ the app is to emit structured **JSON to stdout** under the
`prod` Spring profile (a `logback-spring.xml` config wiring the already-present
`logstash-logback-encoder` dependency); non-prod would keep the readable
coloured console. Today neither the config file nor any logging-level
configuration exists — the encoder dependency sits in `pom.xml` inert, and the
app runs on Spring Boot's default (unstructured) console logging in every
profile. In production the **container log driver** (awslogs on ECS /
CloudWatch agent on EC2) would ship stdout to **CloudWatch Logs** — the app
makes no CloudWatch API calls for logging. Queried via CloudWatch Logs Insights.

**Correlation.** The frontend stamps every API call with an `X-Request-Id`
(`emptyApi.ts`). `MdcLoggingFilter` adopts it as the MDC `traceId` (minting one
if absent), adds `userId` (the authenticated principal name), and echoes the id
back on the response (exposed via CORS). Every JSON log line carries `traceId` +
`userId`, and the error handler already stamps the same `traceId` into error
bodies — so one id ties a user action to its server log lines (and, later, its
Sentry issue).

**Errors.** Backend error→HTTP mapping is owned by the existing
[exception system](../features/exceptions.md) (`exception/GlobalExceptionHandler`,
RFC 9457 ProblemDetail). It already reads `traceId` from the MDC, so this work
_feeds_ it rather than duplicating it — there is exactly one `@RestControllerAdvice`.
The frontend gains a shared `logger` (`utils/logger.ts`), a root `ErrorBoundary`,
window `error`/`unhandledrejection` capture, and `hidden` source maps for future
symbolication. **Sentry** (free tier, per-layer DSNs) is the chosen vendor for
error tracking + Web Vitals + session replay, wired in a later phase via the
clearly-marked seam (`logger.ts` PROD SEAM). The backend Sentry dependency
(`sentry-spring-boot-starter`) is not yet in `pom.xml` at all — not even
commented — it is future work, to be added when that phase starts.

**Metrics.** _Planned:_ Actuator is to expose `health,info,metrics`, with
Micrometer publishing to `micrometer-registry-cloudwatch2` in prod. Today only
`health` is exposed (Spring Boot's default with no `management.*` config
present), and `micrometer-registry-cloudwatch2` is not a dependency in
`pom.xml` — it is future work, not a deferred-but-present dependency.

**Local parity.** A **LocalStack** container (`compose.yaml`, scoped to
`cloudwatch,logs`) lets the CloudWatch path be exercised in dev. **Garage stays
the S3 implementation** — LocalStack does not replace it.

## Consequences

- Log lines are correlated from day one (`traceId`/`userId` in the MDC,
  `X-Request-Id` echoed on every response); structured JSON output is not — it
  stays on the default console format until `logback-spring.xml` is written.
- The foundation is vendor-neutral: adopting Sentry (or swapping it) touches
  `logger.ts`, `pom.xml`, and config — not call sites.
- stdout-+-log-driver keeps the app free of AWS coupling for logging and works
  identically on any host; the cost is that log _delivery_ is an infra concern
  validated at deploy time (LocalStack mitigates this locally).
- `userId` in logs is currently the principal name (DB-free, cheap), not the
  canonical Mongo id — good enough for correlation, refine if needed.
- Fixed an integration gap: RTK Query's default content-type test missed
  `application/problem+json`, so error bodies would have parsed as text;
  `emptyApi.ts` now broadens it.

## Alternatives considered

- **Pure AWS-native** (CloudWatch Logs/Metrics/X-Ray + **CloudWatch RUM** for the
  frontend). One vendor, no third party — but weaker error-grouping UX, RUM bills
  per event, and replay is more limited than Sentry. Rejected for DX/cost on the
  frontend; CloudWatch is still the logs/metrics sink.
- **Vendor-neutral OpenTelemetry** (OTel SDKs → collector → swappable backend).
  Most portable, but the most upfront wiring for a small team at this stage of
  the product. Deferred; `traceId` today, X-Ray/OTel optional later.
- **App-level CloudWatch Logs appender** (e.g. a Logback CloudWatch appender)
  instead of stdout + log driver. Rejected: couples the app to AWS and duplicates
  what the platform log driver does for free.
