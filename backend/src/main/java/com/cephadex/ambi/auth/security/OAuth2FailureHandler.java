package com.cephadex.ambi.auth.security;

import java.io.IOException;
import java.net.URI;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.auth.config.AuthProperties;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Redirects a failed OAuth2 sign-in (cancelled consent, provider error, state
 * mismatch) to the SPA's login-error page. Without this handler Spring
 * Security falls back to {@code /login?error} on the backend origin, which is
 * not an SPA route, so the user dead-ends on a blank page.
 *
 * <p>No session state changes on failure: the pre-OAuth cookies (including a
 * guest session) are untouched, and the {@code AMBI_RU} returnUrl cookie
 * stashed by {@link OAuthReturnUrlCaptureFilter} is deliberately left in
 * place so a retry within its lifetime still lands on the originally
 * requested page.
 */
@Component
public class OAuth2FailureHandler implements AuthenticationFailureHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuth2FailureHandler.class);

    /**
     * SPA route that surfaces the failure (frontend
     * {@code src/routes/login-error.tsx} — keep in sync if it moves).
     */
    private static final String LOGIN_ERROR_PATH = "/login-error";

    private final AuthProperties props;

    public OAuth2FailureHandler(AuthProperties props) {
        this.props = props;
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException exception) throws IOException {
        if (exception instanceof OAuth2AuthenticationException oauthException) {
            log.warn("OAuth2 sign-in failed with error code [{}]: {}",
                    oauthException.getError().getErrorCode(), exception.getMessage());
        } else {
            log.warn("OAuth2 sign-in failed: {}", exception.getMessage());
        }
        // Mirror OAuth2SuccessHandler#buildFrontendUrl: scheme + authority
        // from the configured frontend origin, path appended verbatim.
        URI origin = URI.create(props.getCors().getFrontendOrigin());
        response.sendRedirect(origin.getScheme() + "://" + origin.getAuthority() + LOGIN_ERROR_PATH);
    }
}
