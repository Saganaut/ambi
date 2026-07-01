package com.cephadex.ambi.auth.controller;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cephadex.ambi.auth.dto.MeResponse;
import com.cephadex.ambi.auth.service.AuthService;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;

/**
 * DEV-only auth shortcuts. Gated by {@code @Profile("DEV")} so the bean does not
 * exist in production (the active profile is {@code PROD} there), which keeps the
 * real auth surface untouched. Its filter chain lives in
 * {@link com.cephadex.ambi.auth.config.DevSecurityConfig}.
 */
@RestController
@RequestMapping("/api/dev")
@Profile("DEV")
public class DevAuthController {

    private final AuthService authService;
    private final SessionCookieFactory cookies;

    public DevAuthController(AuthService authService, SessionCookieFactory cookies) {
        this.authService = authService;
        this.cookies = cookies;
    }

    /**
     * Logs in as the fixed local dev account and issues a real registered session,
     * so headless tooling can screenshot behind-login pages without Google OAuth.
     * Mirrors {@link AuthController#createGuest} — same cookies, self-seeding user.
     */
    @Operation(summary = "DEV-only: mint a registered session for the fixed dev account",
            description = "Logs in as the local dev user and sets AMBI_AT/AMBI_RT so headless "
                    + "tooling can reach behind-login pages. Absent under the PROD profile.")
    @PostMapping("/login")
    public ResponseEntity<MeResponse> login(HttpServletRequest request) {
        AuthService.AuthSession session = authService.devLogin();
        boolean secure = request.isSecure();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.access(session.tokens(), secure).toString())
                .header(HttpHeaders.SET_COOKIE, cookies.refresh(session.tokens(), secure).toString())
                .body(session.me());
    }
}
