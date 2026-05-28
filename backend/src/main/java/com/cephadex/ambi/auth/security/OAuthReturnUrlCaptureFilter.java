package com.cephadex.ambi.auth.security;

import java.io.IOException;
import java.time.Duration;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.filter.OncePerRequestFilter;

import com.cephadex.ambi.auth.config.AuthProperties;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Captures a {@code returnUrl} query parameter on the initial leg of an OAuth2
 * sign-in (e.g. {@code GET /oauth2/authorization/google?returnUrl=/decks/abc})
 * and stashes the <em>sanitized</em> value in a short-lived HttpOnly
 * {@value #COOKIE_NAME} cookie. The
 * {@link com.cephadex.ambi.auth.security.GoogleOAuth2SuccessHandler} reads and
 * clears the cookie on callback, satisfying Inv 2 (returnUrl sanitization) and
 * Inv 3 (carry the value <em>through the OAuth round-trip</em>, not via a
 * state-mutating GET writing to a session).
 *
 * <p>Sanitization happens up-front via {@link ReturnUrlValidator#sanitize}: an
 * attacker-controlled value that fails validation never reaches the cookie.
 * The success handler sanitizes again as defense-in-depth.
 *
 * <p>Registered before Spring's {@code OAuth2AuthorizationRequestRedirectFilter}
 * so the cookie is set on the very response that issues the redirect to the
 * provider.
 */
public class OAuthReturnUrlCaptureFilter extends OncePerRequestFilter {

    /** Cookie holding the validated return path across the OAuth round-trip. */
    public static final String COOKIE_NAME = "AMBI_RU";

    private static final Duration MAX_AGE = Duration.ofMinutes(10);
    private static final String PATH_PREFIX = "/oauth2/authorization/";
    private static final String PARAM = "returnUrl";

    private final AuthProperties props;

    public OAuthReturnUrlCaptureFilter(AuthProperties props) {
        this.props = props;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (request.getRequestURI() != null && request.getRequestURI().startsWith(PATH_PREFIX)) {
            String raw = request.getParameter(PARAM);
            if (raw != null && !raw.isBlank()) {
                String sanitized = ReturnUrlValidator.sanitize(raw);
                // ReturnUrlValidator falls back to "/" for anything unsafe; only
                // bother setting the cookie when the caller actually asked for
                // something other than the default landing path.
                if (!ReturnUrlValidator.DEFAULT.equals(sanitized)) {
                    response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(sanitized, request.isSecure()).toString());
                }
            }
        }
        chain.doFilter(request, response);
    }

    private ResponseCookie buildCookie(String value, boolean secure) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(props.getCookie().getSameSite())
                .path(props.getCookie().getPath())
                .maxAge(MAX_AGE)
                .build();
    }
}
