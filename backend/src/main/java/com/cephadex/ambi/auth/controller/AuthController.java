package com.cephadex.ambi.auth.controller;

import java.time.Duration;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cephadex.ambi.auth.config.AuthProperties;
import com.cephadex.ambi.auth.dto.MeResponse;
import com.cephadex.ambi.auth.dto.RegisterRequest;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.auth.service.AuthService;
import com.cephadex.ambi.auth.service.RedisTokenSessionService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/**
 * The always-available auth endpoints (auth/README.md). {@code /me} is the SPA's
 * session probe and never 401s; {@code /guest} and {@code /logout} are mutations
 * and are therefore CSRF-protected by {@code SecurityConfig}.
 *
 * <p>Phase 2 adds {@code POST /register}, {@code POST /refresh}, and the OAuth2
 * success handler — the filter chain already reserves their matchers.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthProperties props;

    public AuthController(AuthService authService, AuthProperties props) {
        this.authService = authService;
        this.props = props;
    }

    /**
     * Resolves the caller to one of four identity states. Always returns 200 (it
     * is the session probe, not a guarded resource). A preRegistration principal
     * is reported with {@code needsRegistration=true}.
     */
    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal AmbiPrincipal principal) {
        return authService.resolveMe(principal);
    }

    /**
     * Creates an ephemeral guest user and issues a fresh session, rotating the
     * session id at the visitor→guest privilege boundary.
     */
    @PostMapping("/guest")
    public ResponseEntity<MeResponse> createGuest(
            @AuthenticationPrincipal AmbiPrincipal principal, HttpServletRequest request) {
        String currentSessionId = principal != null ? principal.sessionId() : null;
        AuthService.AuthSession session = authService.createGuest(currentSessionId);
        boolean secure = request.isSecure();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, accessCookie(session.tokens(), secure).toString())
                .header(HttpHeaders.SET_COOKIE, refreshCookie(session.tokens(), secure).toString())
                .body(session.me());
    }

    /**
     * Completes registration for a {@code PRE_REGISTRATION} session: identity
     * comes from the session principal (Inv 5), the body carries only chosen
     * fields. Idempotent (Inv 8) — a {@link User} already linked to the
     * session's {@code (provider, sub)} is returned and reopened if closed,
     * making double-submit / back-button safe. Rotates the session id at the
     * preReg→registered privilege boundary (Inv 4).
     */
    @PostMapping("/register")
    public ResponseEntity<MeResponse> register(
            @AuthenticationPrincipal AmbiPrincipal principal,
            @Valid @RequestBody RegisterRequest body,
            HttpServletRequest request) {
        AuthService.AuthSession session = authService.register(principal, body);
        boolean secure = request.isSecure();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, accessCookie(session.tokens(), secure).toString())
                .header(HttpHeaders.SET_COOKIE, refreshCookie(session.tokens(), secure).toString())
                .body(session.me());
    }

    /**
     * Revokes the session in Redis (instant, even with a still-valid JWT) and
     * clears the auth cookies. Idempotent.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @AuthenticationPrincipal AmbiPrincipal principal, HttpServletRequest request) {
        if (principal != null) {
            authService.logout(principal.sessionId());
        }
        boolean secure = request.isSecure();
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clearCookie(props.getCookie().getAccessName(), secure).toString())
                .header(HttpHeaders.SET_COOKIE, clearCookie(props.getCookie().getRefreshName(), secure).toString())
                .build();
    }

    // ── cookie helpers ─────────────────────────────────────────────────────────

    private ResponseCookie accessCookie(RedisTokenSessionService.Tokens tokens, boolean secure) {
        // Session cookie (no Max-Age): the access token is short-lived and re-minted.
        return baseCookie(props.getCookie().getAccessName(), tokens.accessToken(), secure).build();
    }

    private ResponseCookie refreshCookie(RedisTokenSessionService.Tokens tokens, boolean secure) {
        ResponseCookie.ResponseCookieBuilder b =
                baseCookie(props.getCookie().getRefreshName(), tokens.refreshToken(), secure);
        if (tokens.persistent()) {
            b.maxAge(props.getToken().getRefreshPersistentTtl());
        }
        return b.build();
    }

    private ResponseCookie clearCookie(String name, boolean secure) {
        return baseCookie(name, "", secure).maxAge(Duration.ZERO).build();
    }

    private ResponseCookie.ResponseCookieBuilder baseCookie(String name, String value, boolean secure) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)        // JS can never read the auth cookies (XSS can't exfiltrate)
                .secure(secure)        // derived from the request, never hard-coded
                .sameSite(props.getCookie().getSameSite())
                .path(props.getCookie().getPath());
    }
}
