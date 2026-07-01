package com.cephadex.ambi.auth.controller;

import java.time.Duration;

import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.auth.config.AuthProperties;
import com.cephadex.ambi.auth.service.RedisTokenSessionService;

/**
 * Single source of truth for the session auth cookies ({@code AMBI_AT} /
 * {@code AMBI_RT}). The flags set here — {@code HttpOnly}, {@code SameSite=Lax},
 * host-only, and a request-derived {@code Secure} — are a security invariant
 * (auth/README.md Inv 3), so every controller that mints a session shares this
 * factory rather than copy-pasting the cookie construction.
 */
@Component
public class SessionCookieFactory {

    private final AuthProperties props;

    public SessionCookieFactory(AuthProperties props) {
        this.props = props;
    }

    /** Access-token cookie: a session cookie (no Max-Age) since the JWT is short-lived and re-minted. */
    public ResponseCookie access(RedisTokenSessionService.Tokens tokens, boolean secure) {
        return base(props.getCookie().getAccessName(), tokens.accessToken(), secure).build();
    }

    /** Refresh-token cookie: persistent ("stay logged in") sessions carry a Max-Age. */
    public ResponseCookie refresh(RedisTokenSessionService.Tokens tokens, boolean secure) {
        ResponseCookie.ResponseCookieBuilder b =
                base(props.getCookie().getRefreshName(), tokens.refreshToken(), secure);
        if (tokens.persistent()) {
            b.maxAge(props.getToken().getRefreshPersistentTtl());
        }
        return b.build();
    }

    /** Expires a named auth cookie (Max-Age 0) — used by logout. */
    public ResponseCookie clear(String name, boolean secure) {
        return base(name, "", secure).maxAge(Duration.ZERO).build();
    }

    private ResponseCookie.ResponseCookieBuilder base(String name, String value, boolean secure) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)        // JS can never read the auth cookies (XSS can't exfiltrate)
                .secure(secure)        // derived from the request, never hard-coded
                .sameSite(props.getCookie().getSameSite())
                .path(props.getCookie().getPath());
    }
}
