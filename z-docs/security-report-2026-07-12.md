# Ambi Security Audit — 2026-07-12

> **Revised 2026-07-23:** risk acceptances re-justified against the enterprise quality bar per
> [`z-docs/about-project-draft-07-2026.md`](about-project-draft-07-2026.md). The original audit
> framed several acceptances as "learning project" trade-offs; that identity framing has been
> removed and each acceptance re-evaluated against an enterprise-grade bar. Acceptances that still
> hold now state their compensating-control / deployment-scope reasoning explicitly; those that do
> not hold at the enterprise bar have been re-opened and flagged for follow-up (see the
> deployment-context caveat below and the DNS-rebinding residual under Low / Info). Findings, dates,
> and severities are otherwise unchanged.

**Scope:** Full-stack review of the Ambi application — Spring Boot 4 / Java backend, React 19 / TypeScript frontend, and the Docker Compose infrastructure (MongoDB, Redis, Garage S3). Conducted as a read-only audit across six parallel lanes: authentication/authorization, injection & input validation, SSRF & media/storage, secrets/config/infrastructure, frontend/client-side, and dependency/supply-chain. No code was modified.

**Overall posture:** **Good, and notably security-aware.** The core authorization model is sound — every controller re-checks ownership/roster/host on the *loaded* resource rather than trusting request ids, authorities are re-derived from the live user on each request, session fixation and refresh-token reuse are handled, and there is no NoSQL injection, unsafe polymorphic deserialization, or path traversal. The SSRF proxy has a genuine denylist with per-hop redirect revalidation. The findings below cluster in three areas: **configuration hardening for production deployment**, **a cross-user stored-XSS chain**, and **inconsistent input-size validation**. None is a trivially-exploitable remote takeover, but several would matter the moment this is deployed outside a local dev box.

> **Deployment-context caveat:** Much of Ambi's infrastructure (`compose.yaml`, dev credentials) is explicitly dev-only, and the application is currently deployed only on local developer machines. Several findings rated High/Medium are severe *if the dev configuration reaches a shared or public host* and are contained today solely by that strictly-local deployment. Measured against the enterprise quality bar, that containment is **not a risk acceptance but a hard release gate**: every fail-open default below (#1, #4, #5, #6, #12) must be closed before any non-local deployment, and none may be treated as an accepted residual on the strength of "it only runs locally today." They are flagged now because the fail-open defaults make that misstep easy, not because the current local setup is under attack.

---

## Priority summary

| # | Severity | Area | Finding |
|---|----------|------|---------|
| 1 | **High** | Config/Infra | Mongo-Express admin GUI exposed with auth disabled, port on all interfaces |
| 2 | **High** | Frontend + Backend | Cross-user stored XSS: host-authored slide HTML rendered raw to every live-session participant; no sanitizer anywhere — ✅ RESOLVED (client + server) |
| 3 | **High** | Frontend | Open redirect on post-registration navigation (`returnUrl` unvalidated) |
| 4 | **Medium** | Auth | Fail-open default Spring profile (`DEV`) exposes `POST /api/dev/login` + Swagger on a mis-provisioned prod |
| 5 | **Medium** | Auth | JWT signing key falls back to a committed default; no fail-fast in PROD |
| 6 | **Medium** | Auth | `Secure` cookie flag depends on `request.isSecure()`; no `forward-headers-strategy` for proxied TLS |
| 7 | **Medium** | Auth | WebSocket `SUBSCRIBE` not authorized against session roster (known `TODO(C2)`) — ✅ RESOLVED |
| 8 | **Medium** | Media | Image decompression bomb — no decoded-pixel cap before rasterization (DoS) |
| 9 | **Medium** | Media / Injection | Cross-tenant image-key reference via client-supplied `srcKey` (flagged by 2 lanes) |
| 10 | **Medium** | Injection | Slide-content model & several answer payloads have no size/cascade validation (storage DoS) |
| 11 | **Medium** | Frontend | No Content-Security-Policy anywhere client-side |
| 12 | **Medium** | Config | MongoDB/Redis default creds + all-interface port exposure; RedisInsight console on :8001 |
| 13 | **Low/Info** | Various | Garage RPC secret committed, register/login redirect-guard duplication, actuator not allowlisted, no SCA gate, dependency dev-tooling CVEs — see detail |

---

## High

### 1. Mongo-Express admin GUI exposed with authentication disabled

`compose.yaml:38-47`

```yaml
mongo-express:
  ports: ["8081:8081"]
  environment:
    - ME_CONFIG_MONGODB_ADMINPASSWORD=secret
    - ME_CONFIG_BASICAUTH=false
```

`ME_CONFIG_BASICAUTH=false` disables the only auth layer Mongo-Express has, and the port publishes on `0.0.0.0` by default. Anyone able to reach the host on 8081 gets a full unauthenticated read/write GUI over the entire `ambi` database — browse, edit, drop collections, run queries — with no driver or credentials required. This is materially worse than exposing the raw Mongo port.

**Remediation:** set `ME_CONFIG_BASICAUTH=true` with real credentials and bind to `127.0.0.1:8081:8081`; ideally do not run mongo-express anywhere but a throwaway local box. Add a note to `compose.yaml` that it is dev-only and must never be deployed as-is.

### 2. Cross-user stored XSS via unsanitized slide HTML

`frontend/src/shared/components/Forms/Input/RichTextDisplay/RichTextDisplay.tsx:132-138` · `backend .../slide/content/RichTextContent.java:36`

`RichTextDisplay` injects its `value` straight into the DOM via `dangerouslySetInnerHTML` with **no sanitizer** — DOMPurify/sanitize-html exists nowhere in `frontend/src` or `package.json` (confirmed by grep). The component's own comments flag this as unverified (`//TODO: Need to make sure this is secure`). The safety argument rests on the assumption that the HTML always passed through the TipTap editor (whose `Link` extension does enforce a protocol allowlist) — but `RichTextDisplay` never re-parses through TipTap's schema, so anything reaching the field by another route (a direct authenticated `PUT` to the slide/deck endpoint with a crafted `body`, a future import feature, a backend bug) renders as live DOM. On the backend, `RichTextContent.body` stores raw editor HTML with no length cap or sanitization on write.

This crosses a trust boundary: `SessionHeader.tsx:14` renders `currentSlide?.title` via `RichTextDisplay`, and `currentSlide` is streamed over STOMP to **every participant** in a live session. So HTML authored by a deck host is rendered raw in every other participant's browser — `<img src=x onerror=...>`, `<svg onload=...>`, or `<a href="javascript:...">` all execute as authored (only literal `<script>` tags are inert via this API).

**Remediation:** add DOMPurify (or an allowlist sanitizer) and run it on `value` immediately before `dangerouslySetInnerHTML`, independent of what produced the string. **Additionally** sanitize/bound slide HTML server-side on write (`RichTextContent.body`) — defense must not rely solely on "the editor produced it." Resolve the two `TODO`s rather than leaving the assumption unverified.

**Resolution (both halves): ✅ RESOLVED.** Client half (`dfd7690`): `RichTextDisplay` now sanitizes its `value` with DOMPurify (`frontend/src/shared/utils/sanitizeHtml.ts`) immediately before `dangerouslySetInnerHTML`, and both `TODO`s are gone. Server half: `DeckService.addSlide`/`updateSlide` run `RichTextContent.body` through the backend `RichTextSanitizer` (OWASP Java HTML Sanitizer) on every write, so persisted markup is allowlist-clean at the storage boundary regardless of ingestion route (direct API `PUT`, future import). Both sanitizers share one allowlist — formatting/lists/headings/links, inline `style` constrained to `color`/`font-size`, unsafe URL schemes stripped, and `noopener`/`noreferrer` forced on links (reverse-tabnabbing defense). The server forces the safe `rel` on every link, slightly stricter than the client (which forces it only on `target`-bearing links).

### 3. Open redirect on post-registration navigation

`frontend/src/features/auth/hooks/useRegister.ts:128` · `frontend/src/routes/register.tsx:9-11`

```ts
window.location.assign(returnUrl ?? "/");
```

`returnUrl` comes straight from the URL query string with only a `typeof === "string"` check — no leading-slash / same-origin validation. `LoginModal.tsx:88-95` has exactly the right guard (`toRelativeReturnUrl`, added because the backend `ReturnUrlValidator` rejects absolute URLs) but it is a private helper and the register path never applies it. An attacker sends `…/register?returnUrl=https://evil-lookalike.example/login`; the victim completes the real registration and is immediately redirected off-site (CWE-601) — a strong phishing pretext right after a successful signup.

**Remediation:** extract `toRelativeReturnUrl` into a shared util and apply it at every `returnUrl` consumer, including `useRegister`.

---

## Medium

### 4. Fail-open default Spring profile exposes dev login on a mis-provisioned prod

`application.properties:12` (`spring.profiles.active=${ENV:DEV}`) · `auth/config/DevSecurityConfig.java` · `auth/controller/DevAuthController.java`

The dev login is *correctly* fenced by `@Profile("DEV")` — with `ENV=PROD` the bean and its CSRF-disabled permit-all chain do not exist. The risk is the default: if `ENV` is unset in production, the app boots in DEV, and `POST /api/dev/login` mints a full `REGISTERED` session for a fixed account with CSRF disabled (an unauthenticated full-account login), plus Swagger/OpenAPI become reachable.

**Remediation:** default the profile to `PROD` (make DEV opt-in), or add a startup guard that refuses the dev chain unless an explicit non-prod flag is set.

### 5. JWT signing key falls back to a committed default; no fail-fast in PROD

`application.properties:51`

```properties
ambi.auth.token.signing-key=${AMBI_JWT_SIGNING_KEY:dev-only-insecure-signing-key-change-me-please-32b}
```

`application-PROD.properties` neither overrides nor requires this, so a deploy that forgets `AMBI_JWT_SIGNING_KEY` boots on a key committed to the repo, letting anyone with repo access mint validly-signed JWTs. **Rated Medium, not High,** because `RedisTokenSessionService.validate()` treats the signature as a cheap pre-check only — the authoritative check is that the random-UUID `sid` claim resolves to a live Redis session, which a forged JWT cannot conjure. Key compromise alone does not grant account access.

**Remediation:** in PROD, bind the key with no default and fail startup if absent, or reject the known dev value at startup when `profile=PROD`.

### 6. `Secure` cookie flag depends on `request.isSecure()`, no forwarded-header strategy

`auth/controller/SessionCookieFactory.java:47-53` and related handlers; no `server.forward-headers-strategy` in any `application*.properties`

Every auth cookie (`AMBI_AT`, `AMBI_RT`, `AMBI_RU`) sets `Secure` from `request.isSecure()`. Behind a TLS-terminating reverse proxy (the usual prod topology), that returns `false` unless `server.forward-headers-strategy=FRAMEWORK|NATIVE` is set — which it is not. In a proxied deployment, session cookies can be issued without `Secure`, permitting transmission over cleartext HTTP (session theft via downgrade/MITM).

**Remediation:** set `server.forward-headers-strategy=FRAMEWORK` in PROD (and ensure the proxy sends `X-Forwarded-Proto`), or force `secure(true)` in prod.

### 7. WebSocket subscription not authorized against the session roster — ✅ RESOLVED

`session/transport/SubscribeAuthInterceptor.java`

`SUBSCRIBE` to `/topic/liveSession/<publicId>` previously required only an authenticated, non-visitor principal — it did not verify roster membership, unlike the REST snapshot `GET /api/liveSessions/{id}` which enforces it via `ParticipantResolver.resolve`. Any signed-in user who learned a session's `publicId` could subscribe to the full live event stream (scoreboard, reveals, presence) without joining. Bounded by the fact that `publicId` is a random UUID and payloads use participant-safe DTOs (no answer key).

**Resolution (as recommended):** `SubscribeAuthInterceptor` now loads the session by `publicId` and resolves the subscriber to a non-banned roster participant via the shared `ParticipantResolver.find`, rejecting any non-roster (or unauthenticated / visitor / unknown-session) SUBSCRIBE — mirroring the REST check. The `TODO(C2)` "participant token" blocker was not real: roster membership resolves off the persisted `Participant.userId` (stripped only from the wire, never from the stored document), the same identity the REST command surface already authorizes on.

### 8. Image decompression bomb — no decoded-pixel cap

`media/gallery/ImageIngestService.java:96,104,129`

`ImmutableImage.loader().fromBytes(bytes)` fully decodes the upload into memory before `source.bound(...)` rasterizes it. Only the *compressed* input is bounded (10 MB); there is no limit on decoded dimensions. A few-hundred-KB PNG/GIF declaring enormous dimensions can expand to gigabytes of heap and OOM the JVM — a DoS reachable by any user via `POST /api/galleries/{id}/images/upload` and by participants via the live-session drawing path.

**Remediation:** read header dimensions first and reject images whose `width*height` exceeds a sane pixel budget before calling `fromBytes`.

### 9. Cross-tenant image-key reference via client-supplied `srcKey`

`media/storage/AppImageDeserializer.java:69-84` · `media/storage/ImageUrlResolver.java:122-130` · `presentation/deck/dto/SetImageRequest.java` (*independently flagged by the media and injection lanes*)

`AppImageDeserializer` takes the client's `srcKey`, passes any non-`http(s)` value through unchanged, and rebuilds the full variant key set from it — with no check that the referenced keys belong to the caller. A user can `POST` a gallery/deck/slide/theme image referencing `gallery/<other-uuid>/original`; on read the server presigns and serves another tenant's private object. **Bounded** because legitimate keys are random UUIDv4 (blind guessing infeasible), but any key the attacker has *seen* (a shared deck, a leaked presigned URL, logs) can be permanently re-referenced and served indefinitely, even after losing access to the source. Notably, the live-session drawing path already defends against exactly this by enforcing a `drawing/{sessionId}/{participantId}/` namespace check (`LiveSessionAnswerService.java:201-208`) — that model is absent for gallery/deck/slide/theme embedding. The same DTO also exposes an unbounded free-form `metadata` map and a client-set `id` (over-posting vector).

**Remediation:** require internal `srcKey`s to resolve from a URL the server actually signed (reject raw-key passthrough for `external:false`), or accept only a gallery-image id and dereference server-side; bound/whitelist `metadata`.

### 10. Slide-content model and several answer payloads lack size/cascade validation

`presentation/deck/dto/SlideRequest.java:32-42` · slide `content/*` types · `session/answer/dto/payload/TextAnswer.java`, `McqAnswer.java`

`SlideRequest` is bound with `@Valid` but carries **zero** constraints, and its polymorphic `content` field has no `@Valid`, so nested validation cannot cascade. Every `SlideContent` subtype uses `@Schema(requiredMode=REQUIRED)` — OpenAPI docs only, not validation — with uncapped collections (`McqContent.options`, `GridContent.rowLabels/colLabels/items`, `AxisContent.items`, etc.) and unbounded strings (`RichTextContent.body`, `title`). On the lower-trust participant surface, `TextAnswer.text` and `McqAnswer.optionIds` have no `@Size` and are stored as-is (the service comments *"Other content types are stored as-is"*). An edit-capable user or participant can PUT/POST multi-MB payloads or millions of options, bloating the deck toward the 16 MB Mongo cap and burning parser memory (storage/memory DoS). There is also **no global JSON request-body size limit** — only multipart is capped — which compounds this.

**Remediation:** add `@Valid` to `SlideRequest.content`, `@Size` to its strings and each content type's collections/labels (sourced from `ValidationConstants`), and `@Size` to the free-form answer payloads. Mirror the already-exemplary `UpdateDeckRequest`/`SetTagsRequest`. Consider a global JSON body-size limit.

### 11. No Content-Security-Policy

`frontend/index.html` (absent) — no client-side CSP; no server-header CSP asserted by the frontend

Given finding #2's XSS surface, even a moderate `script-src 'self'` would materially reduce the impact of any HTML injection that lands. Currently there is no defense-in-depth layer.

**Remediation:** add a CSP (meta tag or, preferably, a server response header).

### 12. MongoDB/Redis default credentials + all-interface exposure

`compose.yaml:1-23`

Mongo (`root`/`secret`) and Redis (`--requirepass password`, `--protected-mode no`) publish on `0.0.0.0` with trivial credentials, and RedisInsight's web console is exposed on `:8001`. Fine on a firewalled laptop; a direct network exposure of both datastores if this compose file is ever run on a cloud VM or shared host.

**Remediation:** bind dev ports to `127.0.0.1`; never reuse these credentials outside strictly loopback contexts; document compose.yaml as dev-only.

---

## Low / Info

- **Garage RPC secret committed** — `garage.toml:8-9` ships a static `rpc_secret`. Low impact today (single node, flagged dev-only-replace-in-prod), but a real committed value; generate it via a setup script or add a prod-rotation checklist item.
- **DNS-rebinding (TOCTOU) residual on the SSRF proxy — ⚠️ RE-OPENED (previously accepted in-code)** — `media/storage/RemoteImageService.java:122-157`. `guardAddresses` validates resolved IPs, but `HttpClient` re-resolves the hostname at connect time, so a DNS-flipping attacker could reach metadata/internal services (e.g. `169.254.169.254`). This was documented and accepted in-code as out of scope for early development. That acceptance does **not** hold at the enterprise quality bar: it is a genuine bypass of an otherwise-thorough SSRF guard on a proxy that fetches user-supplied hosts, and it becomes materially exploitable the moment the service runs on a cloud host exposing an instance-metadata endpoint. Likelihood is low on the current single-node local deployment, but it is no longer an accepted residual. **Follow-up required — closing it:** pin the socket to the already-vetted IP (custom resolver, or connect to the validated address) while sending the original `Host` header, so the connection cannot be re-pointed between check and connect.
- **`externalSrc` / AVIF stored without scheme or magic-byte validation** — `AppImageDeserializer.java:49`, `ImageIngestService.java:80-92`. `javascript:`/`data:` values in `externalSrc` are persisted (not a server-side SSRF vector; impact depends on frontend sink safety — see #2). AVIF bytes are stored without a decode check. Low; allowlist `http(s)` on `externalSrc` and verify magic bytes.
- **`shareDeck` does not validate the grantee exists** — `DeckController.java:143`. Manager-only, so impact is dangling ACL entries; cosmetic.
- **Return-URL guard duplication** — `LoginModal.toRelativeReturnUrl` is not shared, which is precisely how the register open redirect (#3) crept in. Extract to a shared util.
- **`CreateThemeRequest.spec` (`ThemeSpec`) is neither `@Valid` nor bounded** — `theme/dto/CreateThemeRequest.java:29`. The renderable spec is unvalidated/uncapped.
- **Actuator not explicitly allowlisted** — no `management.endpoints.web.exposure.*` config. Only `/health`/`/info` are exposed by Spring defaults today (safe), but a future `include=*` for debugging would have no additional gate. Add an explicit allowlist.
- **`dev.env` contains a real-shaped Google OAuth client secret but is correctly gitignored** — untracked, never committed (verified against git history). No repo-leak; just be mindful a stray `git add -f`/`-A` could commit it. Rotate periodically per normal OAuth hygiene if it is a real registered app.

---

## Dependencies / supply chain

- **Frontend (npm):** 5 known vulns (0 critical, 2 high, 1 moderate, 2 low), **all rooted in devDependencies** (Vite dev server, Storybook, jsdom/vitest, Figma Code Connect CLI, codegen/lint tooling). None ships in the `vite build` output, so runtime/user-facing exploitability is low; the two "high" (`vite`, `undici`) are Windows-specific bypasses and this repo runs on Linux. Fixes available via `npm audit fix` (not run). Lockfile present and committed.
- **Backend (Maven):** Dependency tree is clean of any confirmable vulnerable transitive pull — **no `log4j-core`** (Log4Shell N/A), SnakeYAML 2.5 (past CVE-2022-1471), Nimbus 10.4 and jjwt 0.12.6 past their historical CVEs. **Important caveat:** the stack is Spring Boot 4.0.6 / Framework 7.0.7 / Security 7.0.5 / Jackson 2.21.2 — all newer than confident CVE-mapping allows. Absence of a flagged CVE here is **not** a clean bill of health.
- **No automated SCA gate** — no OWASP dependency-check/Snyk in the Maven build, no `dependabot.yml`/`renovate.json` for either ecosystem.
- **Recommendation:** run a real SCA tool (OWASP dependency-check, Snyk, or enable GitHub Dependabot alerts) against the current advisory DB before treating the backend as clear, and add a dependency-update bot.

---

## What is done well (verified, no action)

- **Object-level authorization** is enforced server-side on the loaded resource across every controller (`requireView/Edit/Manage`, `ParticipantResolver.resolve`, `requireHost`); nothing trusts a path/body id. Authorities are re-derived from the live `User` each request, so stale/elevated JWT claims cannot escalate and deleted users are rejected.
- **Session fixation** handled — session id rotated at every privilege boundary (visitor→guest→registered, OAuth success). **Refresh-token rotation with reuse detection** kills the token family on replay; logout/revoke is instant (Redis authoritative).
- **CSRF** — double-submit cookie on all state-changing routes; only framework `/oauth2/**` exempted; auth cookies `HttpOnly`. Frontend CSRF handling (`X-XSRF-TOKEN`) is correct and no token is stored in `localStorage`/`sessionStorage`.
- **CORS** locked to a single configured origin with `allowCredentials(true)` — no wildcard+credentials bug.
- **Open-redirect defense on the OAuth `returnUrl`** (`ReturnUrlValidator.sanitize`) — rejects protocol-relative, backslash, scheme, and host forms; validated on capture and re-validated on callback. (The register path #3 is the one place this discipline was not reused.)
- **No NoSQL injection** — all Mongo queries parameterized via `.is(...)`; no `@Query`, `$where`, JS execution, or user-built regex. **No unsafe polymorphic deserialization** — all `@JsonTypeInfo` use `Id.NAME` with explicit `@JsonSubTypes` allowlists. **No path traversal** — S3 keys are UUID-derived. **No ReDoS** — validation regexes are linear.
- **SSRF proxy defense** is thorough — scheme allowlist, per-hop redirect re-validation, rejection of loopback/any-local/link-local (incl. `169.254.169.254`)/site-local/IPv6-ULA, response size cap and timeouts. **Object storage** keeps the bucket private, serves via short-lived presigned GETs never persisted, and mints no client-side upload presigns. The **drawing-upload path** correctly namespaces keys per session/participant — the model the gallery/deck path (#9) should adopt.
- **Prod hardening already present** — Swagger disabled in PROD (both flags), error messages/stacktraces masked (`include-*=never`) with a generic 5xx body, dev controller + dev security chain both `@Profile("DEV")`-gated, MDC logging stores only traceId + userId (no cookies/tokens/PII), test config uses clearly-fake secrets.

---

## Recommended remediation order

1. **Before any non-local deployment:** #1 (mongo-express), #4 (default profile → PROD), #5 (JWT key fail-fast), #6 (forwarded-headers/Secure cookie), #12 (bind datastore ports). These are the fail-open production traps.
2. **Cross-user XSS chain:** #2 — add a sanitizer at the `RichTextDisplay` sink *and* sanitize slide HTML server-side; #11 (CSP) as defense-in-depth.
3. **Open redirect:** #3 — extract and reuse the relative-URL guard.
4. **Abuse/DoS hardening:** #8 (pixel-cap decode), #10 (bean-validation bounds + JSON body limit), #9 (bind image keys to owner).
5. **Hygiene:** enable an SCA tool + dependency bot; address the Low/Info list.

---

*Audit performed by an orchestrated set of specialized read-only agents. Findings referencing specific versions of Spring Boot 4 / Spring Security 7 / Jackson 2.21 should be re-verified against a live advisory database, as those releases postdate reliable CVE mapping.*
