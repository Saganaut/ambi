# Using the observability stack

**Not implemented:** A lot of this is aspirational and deferred work.

The "why" is in **[ADR 001 — Observability & logging stack](../decisions/001-observability-stack.md)**;
this is the "how".

**every request carries an `X-Request-Id`**. The frontend mints it, the
backend adopts it into the SLF4J MDC as `traceId`, and it comes back on the `X-Request-Id` response
header and in error bodies. That id ties a user click to a server-side stack trace.

## What exists today

`MdcLoggingFilter`'s `traceId`/`userId` MDC, the `X-Request-Id` echo, and the RFC 9457
`ProblemDetail` error path. **Not implemented:** structured JSON logging (no `logback-spring.xml`,
so `logstash-logback-encoder` sits inert and the `prod` profile changes nothing about log output),
file logging (`./scripts/ambi.sh -f` sets the `filelog` profile but nothing interprets it — no file
is written), and CloudWatch metrics. LocalStack is pre-positioned for the deferred metrics path
only; it does nothing for logging.

## Backend: emitting logs

A hand-rolled logger per class — we do **not** use `@Slf4j`:

```java
private static final Logger log = LoggerFactory.getLogger(MyService.class);
log.info("Deck published deckId={} elements={}", deckId, count);
```

Never set `traceId`/`userId` yourself; `MdcLoggingFilter` has already put them in the MDC. The
default console pattern does not print MDC values, so read them off the error response body or the
`X-Request-Id` header rather than expecting bracketed console text.

**Do not catch-and-swallow.** Let exceptions reach `GlobalExceptionHandler` (the single
`@RestControllerAdvice`), which logs 5xx with the stack trace + `traceId`. See
[exception-rules](../rules/exception-rules.md).

Run it with [`./scripts/ambi.sh`](running-the-project.md), or backend-only with
`set -a; source dev.env; set +a` first — that export is what gets `dev.env` into the process.

## Frontend: emitting logs

Import the shared logger — never call `console.*` directly in new code:

```ts
import { logger } from "@/shared/utils/logger";

logger.info("Deck saved", { deckId });
logger.error("Failed to load deck", { deckId, err });
```

Dev is pretty console output; prod is quiet except `error`. The single Sentry seam is the
`PROD SEAM` comment in `logger.ts`. You rarely log errors by hand: `emptyApi.ts`'s
`baseQueryWithAuthPrompt` logs every non-401 API failure with the server `traceId`, and the root
`ErrorBoundary` (`routes/__root.tsx`) catches render crashes (`window.onerror` /
`unhandledrejection` are wired in `main.tsx`).

## Verifying the correlation thread

1. **A supplied id is honoured and echoed** on any permitted route:

   ```bash
   curl -si -H "X-Request-Id: smoke-123" http://localhost:8080/actuator/health | grep -i x-request-id
   # → X-Request-Id: smoke-123      (omit the header and you get a fresh UUID instead)
   ```

2. **The same id lands in the error body** — needs a session, because an unauthenticated request is
   rejected by the security entry point *before* `MdcLoggingFilter` runs, so it echoes no header and
   carries a different, generated `traceId`:

   ```bash
   curl -s -X POST http://localhost:8080/api/dev/login -c /tmp/dev-cookies.txt > /dev/null
   curl -s -b /tmp/dev-cookies.txt -H "X-Request-Id: smoke-123" \
     http://localhost:8080/api/decks/000000000000000000000000
   # → {"detail":"Deck not found", ..., "traceId":"smoke-123"}
   ```

3. **From the browser**: DevTools → Network, trigger any API call, confirm the request's
   `X-Request-Id` equals the response's, then grep the backend logs for it.

## Health & metrics (Actuator)

There is no `management.*` config, so Spring Boot's default health-only exposure applies, and
`SecurityConfig` permits only `/actuator/health/**`:

```bash
curl -s http://localhost:8080/actuator/health    # {"status":"UP", ...}
curl -s http://localhost:8080/actuator/metrics   # 401 — not exposed or permitted
```

`info`/`metrics` exposure and Micrometer → CloudWatch are deferred (ADR 001). Actuator's
`/actuator/health` is the only health surface — there is no `/api/health` controller.
