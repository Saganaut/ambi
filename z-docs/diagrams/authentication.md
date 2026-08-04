# Authentication & Sessions

Cookie-based auth with Redis as the authoritative session store. Access
(`AMBI_AT`) and refresh (`AMBI_RT`) tokens are HttpOnly cookies; the servlet
session is **stateless** — every request is validated against Redis.

Entry points: `SecurityConfig`, `CookieAuthenticationFilter`,
`OAuth2SuccessHandler`, `RedisTokenSessionService`. Client side:
[Frontend Architecture](frontend-architecture.md#auth-state-machine).

Three providers are wired — Google and Microsoft (OIDC, keyed on `sub`) and
Discord (plain OAuth2, keyed on `id`, unverified email treated as absent). The
flow below is identical for all three; only the claim mapping differs.

## Identity state machine

Every caller resolves to one of four states via `GET /api/auth/me` (never 401s).
`PRE_REGISTRATION` identity lives only in the session — no `User` document yet.
`/refresh` is `permitAll` with no identity check: it slides whichever session
cookie it is given, in any state.

```mermaid
stateDiagram-v2
    [*] --> VISITOR : no cookie
    VISITOR --> GUEST : POST /api/auth/guest
    VISITOR --> PRE_REGISTRATION : OAuth, no matching user
    GUEST --> REGISTERED : OAuth (upgrade in place)
    PRE_REGISTRATION --> REGISTERED : POST /api/auth/register
    GUEST --> GUEST : POST /api/auth/refresh (slide)
    REGISTERED --> REGISTERED : POST /api/auth/refresh (slide)
    GUEST --> VISITOR : logout / guest TTL expiry
    REGISTERED --> VISITOR : POST /api/auth/logout
```

## OAuth 2.0 login (Google shown; Discord/Microsoft are identical)

```mermaid
sequenceDiagram
    autonumber
    participant FE as Browser (SPA)
    participant CAP as OAuthReturnUrlCaptureFilter
    participant SEC as Spring Security<br/>OAuth2 filter
    participant GOOG as Google
    participant SH as OAuth2SuccessHandler
    participant TS as RedisTokenSessionService
    participant DB as MongoDB (users)
    participant R as Redis

    FE->>CAP: GET /oauth2/authorization/google?returnUrl=/path
    CAP->>CAP: sanitize returnUrl → cookie AMBI_RU (10m)
    CAP->>SEC: continue
    SEC-->>FE: 302 redirect to Google
    FE->>GOOG: authenticate & consent
    GOOG-->>FE: 302 /login/oauth2/code/google?code
    FE->>SEC: GET .../code/google?code
    SEC->>GOOG: exchange code for profile
    SEC->>SH: onAuthenticationSuccess(auth)

    alt existing (provider, sub)
        SH->>DB: findByProviderAndSubject
        DB-->>SH: User → seed REGISTERED principal
    else pre-OAuth GUEST session present
        SH->>TS: validate AMBI_AT (GUEST)
        SH->>DB: upgradeGuestToRegistered (keep _id/username)
        DB-->>SH: seed REGISTERED principal
    else no user, no guest
        SH->>SH: seed PRE_REGISTRATION principal (no userId)
    end

    SH->>TS: rotate(oldSid, seed, persistent=false)
    TS->>R: revoke old session, mint new session + refresh
    R-->>TS: tokens
    SH->>FE: Set-Cookie AMBI_AT/AMBI_RT · clear AMBI_RU
    SH-->>FE: 302 → frontend origin + sanitized path
```

## Guest creation & per-request validation

```mermaid
sequenceDiagram
    autonumber
    participant FE as Browser
    participant AC as AuthController
    participant AS as AuthService
    participant TS as RedisTokenSessionService
    participant DB as MongoDB
    participant R as Redis

    Note over FE,R: Create a guest
    FE->>AC: POST /api/auth/guest
    AC->>AS: createGuest(currentSid)
    AS->>DB: create ephemeral guest User (guestExpiresAt TTL)
    AS->>TS: rotate(currentSid, GUEST seed)
    TS->>R: revoke old, mint AMBI_AT/AMBI_RT
    AS-->>AC: AuthSession(tokens, MeResponse GUEST)
    AC-->>FE: Set-Cookie + { state: GUEST }

    Note over FE,R: Every subsequent request
    FE->>AC: any /api/** with AMBI_AT cookie
    Note over AC: CookieAuthenticationFilter
    AC->>TS: validate(accessJwt)
    TS->>R: GET ambi:userSession:{sid}
    R-->>TS: UserSession (or empty → anonymous)
    AC->>DB: load live User (GUEST/REGISTERED only)
    AC->>AC: set SecurityContext (AmbiPrincipal)
```

## Refresh — sliding rotation with reuse detection

`AMBI_AT` is short-lived; `AMBI_RT` slides the session. Refresh tokens rotate on
every use with a burn-and-grace window so a replayed (stolen) token trips
family-wide revocation.

```mermaid
sequenceDiagram
    autonumber
    participant FE as Browser
    participant AC as AuthController
    participant TS as RedisTokenSessionService
    participant R as Redis

    FE->>AC: POST /api/auth/refresh (AMBI_RT cookie)
    AC->>TS: refresh(refreshToken)
    TS->>R: GET ambi:refresh:{token}
    alt token burned (reuse!)
        R-->>TS: burned=true
        TS->>R: revoke entire refresh family
        TS-->>AC: 401 → force re-auth
    else valid
        R-->>TS: RefreshTokenRecord + backing session
        TS->>R: write NEW refresh first (crash-safe)
        TS->>R: mark OLD burned (2m grace)
        TS->>R: slide UserSession TTL
        TS-->>AC: new tokens + session
        AC-->>FE: Set-Cookie AMBI_AT/AMBI_RT
    end
```

## Security filter chain

```mermaid
flowchart TB
    REQ["Incoming /api/** request"] --> CAP["OAuthReturnUrlCaptureFilter<br/>(OAuth start only)"]
    CAP --> CSRF["CSRF: double-submit cookie<br/>X-XSRF-TOKEN + CookieCsrfTokenRepository<br/>(fixed early chain position)"]
    CSRF --> COOKIE["CookieAuthenticationFilter<br/>AMBI_AT → RedisTokenSessionService.validate<br/>→ AmbiAuthenticationToken<br/>(added just before AuthorizationFilter)"]
    COOKIE --> AUTHZ["AuthorizationFilter<br/>permitAll · ROLE_PRE_REGISTRATION<br/>ROLE_GUEST floor · ROLE_USER catch-all"]
    AUTHZ --> CTRL["Controller + @AuthenticationPrincipal"]

    subgraph redis["Redis (authority)"]
        S1["ambi:userSession:{sid}"]
        S2["ambi:refresh:{token}"]
    end
    COOKIE -.-> S1
```
