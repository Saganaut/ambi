package com.cephadex.ambi.auth.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import com.cephadex.ambi.auth.config.AuthProperties;

import jakarta.servlet.http.Cookie;

/**
 * Pins the cookie behaviour around {@link OAuthReturnUrlCaptureFilter}: write
 * the cookie only when the URI is an OAuth authorization start <em>and</em>
 * the {@code returnUrl} survives {@link ReturnUrlValidator#sanitize}, never
 * otherwise. The success handler relies on these properties for Inv 2/3.
 */
class OAuthReturnUrlCaptureFilterTest {

    private OAuthReturnUrlCaptureFilter filter;

    @BeforeEach
    void setUp() {
        filter = new OAuthReturnUrlCaptureFilter(new AuthProperties());
    }

    @Test
    void setsCookieWithSanitizedPathOnOAuthStart() throws Exception {
        MockHttpServletResponse response = invoke("/oauth2/authorization/google", "/decks/abc?x=1");

        Cookie cookie = response.getCookie(OAuthReturnUrlCaptureFilter.COOKIE_NAME);
        assertThat(cookie).isNotNull();
        assertThat(cookie.getValue()).isEqualTo("/decks/abc?x=1");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getPath()).isEqualTo("/");
    }

    @Test
    void skipsCookieForProtocolRelativeReturnUrl() throws Exception {
        // ReturnUrlValidator coerces this to "/" — no point setting a cookie.
        MockHttpServletResponse response = invoke("/oauth2/authorization/google", "//evil.tld/path");
        assertThat(response.getCookie(OAuthReturnUrlCaptureFilter.COOKIE_NAME)).isNull();
    }

    @Test
    void skipsCookieForAbsoluteSchemeReturnUrl() throws Exception {
        MockHttpServletResponse response = invoke("/oauth2/authorization/google", "https://evil.tld/path");
        assertThat(response.getCookie(OAuthReturnUrlCaptureFilter.COOKIE_NAME)).isNull();
    }

    @Test
    void skipsCookieWhenReturnUrlAbsent() throws Exception {
        MockHttpServletResponse response = invoke("/oauth2/authorization/google", null);
        assertThat(response.getCookie(OAuthReturnUrlCaptureFilter.COOKIE_NAME)).isNull();
    }

    @Test
    void skipsCookieForNonOAuthAuthorizationUri() throws Exception {
        // The capture filter is strictly scoped to the OAuth start leg.
        MockHttpServletResponse response = invoke("/api/something", "/decks");
        assertThat(response.getCookie(OAuthReturnUrlCaptureFilter.COOKIE_NAME)).isNull();
    }

    private MockHttpServletResponse invoke(String uri, String returnUrl) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", uri);
        request.setRequestURI(uri);
        if (returnUrl != null) {
            request.setParameter("returnUrl", returnUrl);
        }
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }
}
