package com.cephadex.ambi.auth.security;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.auth.config.AuthProperties;
import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.service.RedisTokenSessionService;
import com.cephadex.ambi.auth.service.UserSession;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.UserService;
import com.cephadex.ambi.user.enums.UserLevel;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Resolves an OAuth2 sign-in into one of the three post-OAuth identity states
 * (auth/README.md state diagram) and issues fresh auth cookies for it:
 *
 * <ol>
 *   <li><b>Existing User</b> for {@code (provider, sub)} — log in as that User
 *       (reopening if closed). The pre-OAuth session, including any guest, is
 *       abandoned via session-id rotation (Inv 4). The abandoned guest
 *       {@code User} record is left for the (Phase 2) reaper.</li>
 *   <li><b>Pre-OAuth GUEST session, no existing User</b> — upgrade the guest's
 *       own {@code User} document in place (Inv 1): provider/sub/email written,
 *       {@code userLevel=USER}. Mongo {@code _id} and {@code username} survive
 *       — no {@code ?guestId=} parameter ever participates.</li>
 *   <li><b>Anything else, no existing User</b> — issue a {@code PRE_REGISTRATION}
 *       session holding the OAuth claims (provider, sub, email) only. The
 *       frontend reads {@code needsRegistration=true} on {@code /me} and routes
 *       to the registration screen.</li>
 * </ol>
 *
 * <p>Always rotates the session id (Inv 4) and re-validates the
 * {@code returnUrl} cookie stashed by
 * {@link OAuthReturnUrlCaptureFilter} (Inv 2) before redirecting to the
 * frontend.
 *
 * <p>This handler reads the pre-OAuth identity from the {@code AMBI_AT} cookie
 * directly rather than from {@code SecurityContextHolder}: the OAuth2 login
 * filter replaces the {@code SecurityContext} before invoking the success
 * handler, so the cookie is the only surviving link to the previous principal
 * for guest-upgrade detection.
 */
@Component
public class GoogleOAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private static final Logger log = LoggerFactory.getLogger(GoogleOAuth2SuccessHandler.class);

    /** The {@code OAuth2User} attribute keys we depend on (Google's OIDC claims). */
    private static final String CLAIM_SUB = "sub";
    private static final String CLAIM_EMAIL = "email";

    /** Maps a Spring Security registration id to our internal {@link AuthProvider}. */
    private static final Map<String, AuthProvider> PROVIDER_BY_REGISTRATION_ID = Map.of(
            "google", AuthProvider.GOOGLE);

    private final AuthProperties props;
    private final RedisTokenSessionService tokenService;
    private final UserService userService;

    public GoogleOAuth2SuccessHandler(AuthProperties props,
            RedisTokenSessionService tokenService,
            UserService userService) {
        this.props = props;
        this.tokenService = tokenService;
        this.userService = userService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException {

        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        AuthProvider provider = PROVIDER_BY_REGISTRATION_ID.get(oauthToken.getAuthorizedClientRegistrationId());
        if (provider == null) {
            // Misconfigured registration — fail closed rather than guessing.
            log.warn("Unmapped OAuth registration id {}", oauthToken.getAuthorizedClientRegistrationId());
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return;
        }

        OAuth2User oauthUser = oauthToken.getPrincipal();
        String externalProviderId = stringAttribute(oauthUser, CLAIM_SUB);
        String email = stringAttribute(oauthUser, CLAIM_EMAIL);
        if (externalProviderId == null || externalProviderId.isBlank()) {
            log.warn("OAuth principal missing required 'sub' claim");
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return;
        }

        // Pre-OAuth identity, read straight from the cookie because the OAuth
        // login filter has already replaced SecurityContextHolder.
        Optional<UserSession> preSession = readPreOAuthSession(request);
        String oldSessionId = preSession.map(UserSession::getSessionId).orElse(null);

        AmbiPrincipal seed = branchToPrincipal(provider, externalProviderId, email, preSession);

        // Inv 4: rotate at every privilege boundary, including OAuth success.
        RedisTokenSessionService.Tokens tokens = tokenService.rotate(oldSessionId, seed, /*persistent=*/ false);

        boolean secure = request.isSecure();
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie(tokens.accessToken(), secure).toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie(tokens.refreshToken(), secure, false).toString());

        String target = consumeReturnUrl(request, response, secure);
        response.sendRedirect(buildFrontendUrl(target));
    }

    // ── branching ────────────────────────────────────────────────────────────

    /**
     * Resolves which of the three post-OAuth states applies and returns a
     * principal seed suitable for {@link RedisTokenSessionService#rotate}.
     */
    private AmbiPrincipal branchToPrincipal(AuthProvider provider, String externalProviderId, String email,
            Optional<UserSession> preSession) {

        Optional<User> existing = userService.findByProviderAndSubject(provider, externalProviderId);
        if (existing.isPresent()) {
            User user = existing.get();
            if (user.isClosed()) {
                user = userService.reopen(user);
            }
            return registeredPrincipal(user, provider, externalProviderId, email);
        }

        // No existing User for this identity. A guest may upgrade in place; any
        // other pre-session state falls through to PRE_REGISTRATION.
        if (preSession.isPresent() && preSession.get().getState() == IdentityState.GUEST) {
            User guest = userService.findById(preSession.get().getUserId()).orElse(null);
            if (guest != null && guest.getUserLevel() == UserLevel.GUEST) {
                User upgraded = userService.upgradeGuestToRegistered(guest, provider, externalProviderId, email);
                return registeredPrincipal(upgraded, provider, externalProviderId, email);
            }
            // Stale guest session (User vanished or already upgraded by another
            // window) — fall through.
        }

        return new AmbiPrincipal(IdentityState.PRE_REGISTRATION,
                null, null, null,
                provider, externalProviderId, email, null);
    }

    private static AmbiPrincipal registeredPrincipal(User user, AuthProvider provider,
            String externalProviderId, String email) {
        return new AmbiPrincipal(IdentityState.REGISTERED,
                user.getId(),
                user.getPublicId(),
                user.getUserLevel(),
                provider,
                externalProviderId,
                email,
                null);
    }

    // ── pre-session readback ─────────────────────────────────────────────────

    private Optional<UserSession> readPreOAuthSession(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        String accessName = props.getCookie().getAccessName();
        for (Cookie cookie : cookies) {
            if (accessName.equals(cookie.getName())) {
                return tokenService.validate(cookie.getValue());
            }
        }
        return Optional.empty();
    }

    // ── returnUrl round-trip ─────────────────────────────────────────────────

    /**
     * Reads the {@link OAuthReturnUrlCaptureFilter#COOKIE_NAME} cookie if
     * present, re-sanitizes it (defense-in-depth — the filter already did),
     * and clears the cookie on the response.
     */
    private String consumeReturnUrl(HttpServletRequest request, HttpServletResponse response, boolean secure) {
        Cookie[] cookies = request.getCookies();
        String value = null;
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (OAuthReturnUrlCaptureFilter.COOKIE_NAME.equals(cookie.getName())) {
                    value = cookie.getValue();
                    response.addHeader(HttpHeaders.SET_COOKIE, clearCookie(OAuthReturnUrlCaptureFilter.COOKIE_NAME, secure)
                            .toString());
                    break;
                }
            }
        }
        return ReturnUrlValidator.sanitize(value);
    }

    private String buildFrontendUrl(String path) {
        // path is already validated as a same-origin relative path or "/" via
        // ReturnUrlValidator — concatenate, do not parse, to keep the query/
        // fragment intact (URI's path-only constructors lose them).
        URI origin = URI.create(props.getCors().getFrontendOrigin());
        StringBuilder sb = new StringBuilder()
                .append(origin.getScheme()).append("://").append(origin.getAuthority());
        sb.append(path);
        return sb.toString();
    }

    // ── cookie builders (mirror AuthController) ──────────────────────────────

    private ResponseCookie accessCookie(String value, boolean secure) {
        return baseCookie(props.getCookie().getAccessName(), value, secure).build();
    }

    private ResponseCookie refreshCookie(String value, boolean secure, boolean persistent) {
        ResponseCookie.ResponseCookieBuilder b =
                baseCookie(props.getCookie().getRefreshName(), value, secure);
        if (persistent) {
            b.maxAge(props.getToken().getRefreshPersistentTtl());
        }
        return b.build();
    }

    private ResponseCookie clearCookie(String name, boolean secure) {
        return baseCookie(name, "", secure).maxAge(Duration.ZERO).build();
    }

    private ResponseCookie.ResponseCookieBuilder baseCookie(String name, String value, boolean secure) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(props.getCookie().getSameSite())
                .path(props.getCookie().getPath());
    }

    private static String stringAttribute(OAuth2User user, String key) {
        Object value = user.getAttributes().get(key);
        return value != null ? value.toString() : null;
    }
}
