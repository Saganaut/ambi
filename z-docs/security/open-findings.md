# Security — open findings

A living checklist, not a snapshot. Findings originate from the full-stack security audit
conducted **2026-07-12** (backend, frontend, and Docker Compose infrastructure, read-only,
six lanes: authn/authz, injection & input validation, SSRF & media/storage, secrets/config,
frontend, supply chain). Statuses below were re-verified against the codebase on **2026-08-04**.

Update a row when you close a finding — put the evidence (file, commit, or config) in the
Status cell. Every `Open` row should also exist as a Trello card.

## Release gate — must be closed before any non-local deployment

These five are fail-open production traps: each is contained today **only** by the fact that
Ambi runs on local developer machines. That containment is a hard release gate, not a risk
acceptance. **All five are still open.**

| # | Finding | Status |
|---|---------|--------|
| 1 | Mongo-Express admin GUI with auth disabled, published on all interfaces | **Open** — `compose.yaml:46` `"8081:8081"`, `:51` `ME_CONFIG_BASICAUTH=false` |
| 4 | Fail-open default Spring profile (`DEV`) | **Open** — `application.properties:12` still `${ENV:DEV}`, no startup guard |
| 5 | JWT signing key falls back to a committed default | **Open** — `application.properties:87` still defaults; `application-PROD.properties` only disables springdoc |
| 6 | `Secure` cookie flag derived from `request.isSecure()` | **Open** — no `server.forward-headers-strategy` in any properties file; `SessionCookieFactory.java:50` unchanged |
| 12 | MongoDB/Redis reachable on all interfaces with default creds | **Open** — `compose.yaml` mongo `27017` (`root`/`secret`), redis `6379` (`--requirepass password --protected-mode no`) |

## All findings

| # | Sev | Area | Finding | Status |
|---|-----|------|---------|--------|
| 1 | High | Config/Infra | Mongo-Express GUI, `ME_CONFIG_BASICAUTH=false`, port on `0.0.0.0` | **Open** |
| 2 | High | Front + Back | Cross-user stored XSS: host-authored slide HTML rendered raw to every participant | **Fixed** — DOMPurify at the `dangerouslySetInnerHTML` sink (`shared/utils/sanitizeHtml.ts`) plus OWASP `presentation/slide/content/RichTextSanitizer.java`, called on every write from `DeckService.java:193,277` |
| 3 | High | Frontend | Open redirect on post-registration `returnUrl` | **Fixed** — shared `toLocalReturnUrl` (`shared/utils/returnUrl.ts:16`) applied at `routes/register.tsx:14`; accepts only same-origin after browser-equivalent resolution |
| 4 | Med | Auth | Default profile `DEV` exposes `POST /api/dev/login` + Swagger on a mis-provisioned prod | **Open** |
| 5 | Med | Auth | JWT signing key defaults to a committed value; no PROD fail-fast | **Open** |
| 6 | Med | Auth | No forwarded-header strategy, so `Secure` can be dropped behind a TLS proxy | **Open** |
| 7 | Med | Auth | WebSocket `SUBSCRIBE` not authorized against the session roster | **Fixed** — `session/transport/SubscribeAuthInterceptor.java:72` resolves the subscriber via `ParticipantResolver.find`, mirroring the REST check |
| 8 | Med | Media | Image decompression bomb — no decoded-pixel cap | **Open** — `media/storage/ImageIngestService.java:96` decodes with `fromBytes` before any dimension check |
| 9 | Med | Media | Cross-tenant image reference via client-supplied `srcKey` | **Open** — `media/storage/AppImageDeserializer.java:71-73` rebuilds the variant set from the client key with no ownership check |
| 10 | Med | Injection | Slide content and answer payloads lack size/cascade validation | **Partial** — `session/answer/payload/TextAnswer.java:17` gained `@Size`. Still missing: `@Valid` on `SlideRequest.java:31` `content`, `@Size` on `McqAnswer.optionIds`, and any bound on the `SlideContent` subtypes |
| 11 | Med | Frontend | No Content-Security-Policy | **Open** — none in `frontend/index.html`, none set as a response header |
| 12 | Med | Config | Datastore default creds + all-interface exposure | **Open** |
| 13 | Low/Info | Various | See the list below | **Mostly open** |

## Finding detail (open only)

### 1 · Mongo-Express with auth disabled

`ME_CONFIG_BASICAUTH=false` removes the only auth layer Mongo-Express has, and `"8081:8081"`
publishes on `0.0.0.0` — an unauthenticated read/write GUI over the whole `ambi` database to
anyone who can reach the host. **Fix:** enable basic auth with real credentials, bind
`127.0.0.1:8081:8081`, mark the service dev-only.

### 4 · Fail-open default profile

The dev login is correctly fenced by `@Profile("DEV")`; the risk is the *default*. With `ENV`
unset in production the app boots DEV, `POST /api/dev/login` mints a full `REGISTERED` session
for a fixed account with CSRF disabled, and Swagger becomes reachable. **Fix:** default to
`PROD` (make DEV opt-in), or refuse the dev chain without an explicit non-prod flag.

### 5 · Committed JWT signing-key default

A deploy that forgets `AMBI_JWT_SIGNING_KEY` boots on a key that is in the repo. Medium, not
High, because `RedisTokenSessionService.validate()` treats the signature as a pre-check —
authority comes from the random-UUID `sid` resolving to a live Redis session, which a forged JWT
cannot conjure. **Fix:** bind with no default in PROD and fail startup if absent, or reject the
known dev value when `profile=PROD`.

### 6 · `Secure` cookie flag behind a proxy

Every auth cookie (`AMBI_AT`, `AMBI_RT`, `AMBI_RU`) takes `Secure` from `request.isSecure()`,
which is `false` behind a TLS-terminating proxy unless `server.forward-headers-strategy` is set —
so session cookies can travel over cleartext HTTP. **Fix:** set
`server.forward-headers-strategy=FRAMEWORK` in PROD (proxy must send `X-Forwarded-Proto`), or
force `secure(true)` there.

### 8 · Decompression bomb on image ingest

The upload is fully decoded into memory before rasterization, and only the compressed input is
bounded (10 MB). A few-hundred-KB PNG/GIF declaring huge dimensions can expand to gigabytes of
heap — reachable via `POST /api/galleries/{id}/images/upload` and via the drawing path.
**Fix:** read header dimensions and reject `width*height` over a pixel budget before decoding.

### 9 · Cross-tenant `srcKey` passthrough

A client can reference `gallery/<other-uuid>/original` on a gallery/deck/slide/theme image and
the server will presign and serve it. Bounded by UUIDv4 keys being unguessable, but any key an
attacker has *seen* is re-referenceable indefinitely, even after losing access. The drawing path
already defends this by namespacing keys `drawing/{sessionId}/{participantId}/`. The same DTO
also exposes an unbounded `metadata` map and a client-set `id`. **Fix:** require internal
`srcKey`s to resolve from a URL the server signed, or take a gallery-image id and dereference
server-side; bound `metadata`.

### 10 · Missing size and cascade validation

`SlideRequest` is bound with `@Valid` but carries no constraints, and its polymorphic `content`
has no `@Valid`, so nothing cascades — `@Schema(requiredMode=REQUIRED)` is documentation, not
validation. Content collections and strings are uncapped, as is `McqAnswer.optionIds` on the
lower-trust participant surface, and there is no global JSON body-size limit (only multipart is
capped). **Fix:** `@Valid` on `SlideRequest.content`; `@Size` on content collections/strings from
`ValidationConstants` and on `McqAnswer`, mirroring `UpdateDeckRequest`; consider a body limit.

### 11 · No Content-Security-Policy

No defense-in-depth layer behind the #2 sanitizers. **Fix:** add a CSP, preferably as a server
response header.

### 12 · Datastore exposure

Mongo (`root`/`secret`) and Redis (`--requirepass password --protected-mode no`) publish on
`0.0.0.0`, as does the unauthenticated RedisInsight UI on `:8001`. **Fix:** bind dev ports to
`127.0.0.1`, never reuse these credentials
off-loopback, document `compose.yaml` as dev-only.

### 13 · Low / Info

| Item | Status |
|------|--------|
| DNS-rebinding (TOCTOU) residual on the SSRF proxy: `guardAddresses` validates the resolved IP but `HttpClient` re-resolves at connect time | **Open** — `media/storage/RemoteImageService.java:40-42` documents the window in its own javadoc. Fix: pin the socket to the vetted IP while sending the original `Host` header |
| Garage RPC secret committed (`garage.toml`) | **Open** — generate it in a setup script, or add a prod-rotation checklist item |
| `externalSrc` stored without scheme validation; AVIF stored without a magic-byte check | **Open** — both under `media/storage/` |
| `shareDeck` does not validate the grantee exists (`DeckController.java`) | **Open** — manager-only; cosmetic, leaves dangling ACL entries |
| `CreateThemeRequest.spec` neither `@Valid` nor bounded | **Open** |
| Actuator endpoints not explicitly allowlisted | **Open** — Spring defaults expose only `/health` and `/info` today, but a future `include=*` would have no gate |
| Return-URL guard duplication | **Partial** — `toLocalReturnUrl` is now a shared util with tests, but `LoginModal.tsx:106` still wraps it in a local `toRelativeReturnUrl`; fold that fallback into the shared util |
| `dev.env` holds a real-shaped OAuth client secret but is gitignored and never committed | **Accepted** — verified against git history; rotate per normal OAuth hygiene and avoid `git add -f` |

## Supply chain

**No automated SCA gate exists** — no OWASP dependency-check or Snyk in the Maven build, no
`dependabot.yml` or `renovate.json` for either ecosystem. Any point-in-time dependency verdict
rots immediately, so none is recorded here; run a real SCA tool against the current advisory
database instead. Note that Spring Boot 4 / Security 7 / Jackson 2.21 postdate reliable CVE
mapping, so "no flagged CVE" is not a clean bill of health.

## Not re-audited

The 2026-07-12 audit also verified a set of controls as sound — object-level authorization on the
loaded resource, session-fixation handling, refresh rotation with reuse detection, CSRF
double-submit, single-origin CORS, no NoSQL injection or unsafe polymorphic deserialization, and
a thorough SSRF denylist. Those are point-in-time attestations, deliberately not tracked here:
re-verify them in the next audit rather than trusting this list.
