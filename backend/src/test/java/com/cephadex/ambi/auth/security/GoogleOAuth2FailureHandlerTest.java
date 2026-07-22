package com.cephadex.ambi.auth.security;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;

import com.cephadex.ambi.auth.config.AuthProperties;

/**
 * Pins the failure-path redirect of {@link GoogleOAuth2FailureHandler}: every
 * failure lands on the SPA's {@code /login-error} page on the configured
 * frontend origin (never Spring's default {@code /login?error}), and no
 * cookies are touched — the AMBI_RU return-path cookie survives for a retry.
 */
class GoogleOAuth2FailureHandlerTest {

    private static final String FRONTEND_ORIGIN = "http://localhost:5173";

    private GoogleOAuth2FailureHandler handler;

    @BeforeEach
    void setUp() {
        AuthProperties props = new AuthProperties();
        props.getCors().setFrontendOrigin(FRONTEND_ORIGIN);
        handler = new GoogleOAuth2FailureHandler(props);
    }

    @Test
    void oauth2ErrorRedirectsToFrontendLoginErrorPage() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationFailure(new MockHttpServletRequest(), response,
                new OAuth2AuthenticationException(new OAuth2Error("access_denied"), "user cancelled consent"));

        assertThat(response.getRedirectedUrl()).isEqualTo(FRONTEND_ORIGIN + "/login-error");
    }

    @Test
    void nonOAuth2FailureAlsoRedirectsToFrontendLoginErrorPage() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationFailure(new MockHttpServletRequest(), response,
                new AuthenticationServiceException("token endpoint unreachable"));

        assertThat(response.getRedirectedUrl()).isEqualTo(FRONTEND_ORIGIN + "/login-error");
    }

    @Test
    void failureLeavesCookiesUntouched() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationFailure(new MockHttpServletRequest(), response,
                new OAuth2AuthenticationException(new OAuth2Error("invalid_state")));

        // The AMBI_RU returnUrl cookie must survive the failed attempt so a
        // retry still honors the originally requested destination.
        assertThat(response.getHeaders("Set-Cookie")).isEmpty();
        assertThat(response.getCookies()).isEmpty();
    }
}
