package com.cephadex.ambi.auth.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cephadex.ambi.auth.config.AuthProperties;
import com.cephadex.ambi.auth.dto.MeResponse;
import com.cephadex.ambi.auth.dto.RegisterRequest;
import com.cephadex.ambi.auth.dto.UsernameAvailabilityResponse;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.auth.service.AuthService;
import com.cephadex.ambi.common.exception.UnauthorizedException;
import com.cephadex.ambi.common.validation.ValidationConstants;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

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
@Validated // enables constraint checks on @RequestParam (e.g. /username-available)
public class AuthController {

    private final AuthService authService;
    private final AuthProperties props;
    private final SessionCookieFactory cookies;

    public AuthController(AuthService authService, AuthProperties props, SessionCookieFactory cookies) {
        this.authService = authService;
        this.props = props;
        this.cookies = cookies;
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
     * Reports whether a desired username is free to claim — live feedback for
     * the registration screen. Public + safe (GET, no mutation, no session
     * required). The {@code username} constraints mirror {@link RegisterRequest}
     * so malformed input is rejected here exactly as it would be at register;
     * the unique index remains the authority (Inv 9), so {@code available=true}
     * is advisory and can still lose a race at {@code POST /register}.
     */
    @GetMapping("/username-available")
    public UsernameAvailabilityResponse usernameAvailable(
            @RequestParam
            @NotBlank
            @Size(min = ValidationConstants.USERNAME_MIN, max = ValidationConstants.USERNAME_MAX)
            @Pattern(regexp = ValidationConstants.USERNAME_PATTERN,
                    message = "may only contain letters, digits, '.', '_' or '-'")
            String username) {
        return new UsernameAvailabilityResponse(username, authService.isUsernameAvailable(username));
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
                .header(HttpHeaders.SET_COOKIE, cookies.access(session.tokens(), secure).toString())
                .header(HttpHeaders.SET_COOKIE, cookies.refresh(session.tokens(), secure).toString())
                .body(session.me());
    }

    /**
     * Completes registration for a {@code PRE_REGISTRATION} session: identity
     * comes from the session principal (Inv 5), the body carries only chosen
     * fields. Idempotent (Inv 8) — a {@link com.cephadex.ambi.user.User} already linked to the
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
                .header(HttpHeaders.SET_COOKIE, cookies.access(session.tokens(), secure).toString())
                .header(HttpHeaders.SET_COOKIE, cookies.refresh(session.tokens(), secure).toString())
                .body(session.me());
    }

    /**
     * Slides the session: consumes the {@code AMBI_RT} cookie, rotates it
     * (Inv 6) and mints a fresh access JWT, sliding the Redis TTL on the
     * underlying {@code UserSession}. CSRF-protected like any mutation.
     * Returns 401 ({@code REFRESH_FAILED}) if the refresh token is absent,
     * unknown, revoked, or — critically — a replay of an already-consumed
     * token (the token family is also revoked on replay).
     */
    @PostMapping("/refresh")
    public ResponseEntity<MeResponse> refresh(HttpServletRequest request) {
        String refreshToken = readRefreshTokenCookie(request);
        if (refreshToken == null) {
            throw new UnauthorizedException("REFRESH_TOKEN_MISSING",
                    "No refresh token present; please sign in.");
        }
        AuthService.AuthSession session = authService.refresh(refreshToken);
        boolean secure = request.isSecure();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.access(session.tokens(), secure).toString())
                .header(HttpHeaders.SET_COOKIE, cookies.refresh(session.tokens(), secure).toString())
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
                .header(HttpHeaders.SET_COOKIE, cookies.clear(props.getCookie().getAccessName(), secure).toString())
                .header(HttpHeaders.SET_COOKIE, cookies.clear(props.getCookie().getRefreshName(), secure).toString())
                .build();
    }

    private String readRefreshTokenCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        String name = props.getCookie().getRefreshName();
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
