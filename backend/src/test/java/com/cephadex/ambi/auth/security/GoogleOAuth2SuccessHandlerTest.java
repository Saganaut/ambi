package com.cephadex.ambi.auth.security;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;

import com.cephadex.ambi.auth.config.AuthProperties;
import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.service.RedisTokenSessionService;
import com.cephadex.ambi.auth.service.UserSession;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.UserService;
import com.cephadex.ambi.user.enums.UserLevel;

import jakarta.servlet.http.Cookie;

/**
 * Pins the post-OAuth branching of {@link GoogleOAuth2SuccessHandler}:
 * existing-User reuse (Inv 8 idempotency), closed-account reopen,
 * guest-upgrade-in-place (Inv 1, no {@code guestId} from input), and
 * fall-through to PRE_REGISTRATION when no User exists. Session id is rotated
 * in every branch (Inv 4) and the AMBI_RU return-path cookie is consumed and
 * cleared on the way out.
 */
class GoogleOAuth2SuccessHandlerTest {

    private static final String SUB = "google-sub-1";
    private static final String EMAIL = "user@example.com";

    private AuthProperties props;
    private RedisTokenSessionService tokenService;
    private UserService userService;
    private GoogleOAuth2SuccessHandler handler;

    @BeforeEach
    void setUp() {
        props = new AuthProperties();
        // Realistic frontend origin so the redirect URL is well-formed.
        props.getCors().setFrontendOrigin("http://localhost:5173");
        tokenService = mock(RedisTokenSessionService.class);
        userService = mock(UserService.class);
        handler = new GoogleOAuth2SuccessHandler(props, tokenService, userService);

        // Default rotate stub — captures the seed in tests that care.
        when(tokenService.rotate(any(), any(), anyBoolean()))
                .thenReturn(new RedisTokenSessionService.Tokens("acc", "ref", "new-sid", false));
    }

    @Test
    void existingUserBecomesRegisteredAndOldSessionRotated() throws Exception {
        User existing = registeredUser("u-1", UserLevel.USER, false);
        when(userService.findByProviderAndSubject(AuthProvider.GOOGLE, SUB))
                .thenReturn(Optional.of(existing));
        // Pre-OAuth cookie carries a stale visitor — no validate hit will match.
        MockHttpServletRequest request = oauthCallbackRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationSuccess(request, response, oauthToken());

        AmbiPrincipal seed = captureRotateSeed();
        assertThat(seed.state()).isEqualTo(IdentityState.REGISTERED);
        assertThat(seed.userId()).isEqualTo("u-1");
        assertThat(seed.userLevel()).isEqualTo(UserLevel.USER);
        verify(userService, never()).upgradeGuestToRegistered(any(), any(), any(), any());
        verify(userService, never()).reopen(any());
    }

    @Test
    void closedExistingUserIsReopenedBeforeRegisteredSession() throws Exception {
        User existingClosed = registeredUser("u-2", UserLevel.USER, true);
        User reopened = registeredUser("u-2", UserLevel.USER, false);
        when(userService.findByProviderAndSubject(AuthProvider.GOOGLE, SUB))
                .thenReturn(Optional.of(existingClosed));
        when(userService.reopen(existingClosed)).thenReturn(reopened);

        handler.onAuthenticationSuccess(oauthCallbackRequest(), new MockHttpServletResponse(), oauthToken());

        verify(userService).reopen(existingClosed);
        AmbiPrincipal seed = captureRotateSeed();
        assertThat(seed.state()).isEqualTo(IdentityState.REGISTERED);
        assertThat(seed.userId()).isEqualTo("u-2");
    }

    @Test
    void guestSessionUpgradesUserInPlaceWhenNoExistingMatch() throws Exception {
        when(userService.findByProviderAndSubject(AuthProvider.GOOGLE, SUB))
                .thenReturn(Optional.empty());

        // Pre-OAuth cookie validates to a GUEST UserSession.
        UserSession guestSession = guestSession("guest-sid", "u-guest");
        User guestUser = guestUser("u-guest");
        User upgraded = registeredUser("u-guest", UserLevel.USER, false);
        when(tokenService.validate("guest-jwt")).thenReturn(Optional.of(guestSession));
        when(userService.findById("u-guest")).thenReturn(Optional.of(guestUser));
        when(userService.upgradeGuestToRegistered(guestUser, AuthProvider.GOOGLE, SUB, EMAIL))
                .thenReturn(upgraded);

        MockHttpServletRequest request = oauthCallbackRequest();
        request.setCookies(new Cookie(props.getCookie().getAccessName(), "guest-jwt"));

        handler.onAuthenticationSuccess(request, new MockHttpServletResponse(), oauthToken());

        verify(userService).upgradeGuestToRegistered(guestUser, AuthProvider.GOOGLE, SUB, EMAIL);
        AmbiPrincipal seed = captureRotateSeed();
        assertThat(seed.state()).isEqualTo(IdentityState.REGISTERED);
        assertThat(seed.userId()).isEqualTo("u-guest");
        // The old guest session id is what we rotate from.
        ArgumentCaptor<String> oldSid = ArgumentCaptor.forClass(String.class);
        verify(tokenService).rotate(oldSid.capture(), any(), anyBoolean());
        assertThat(oldSid.getValue()).isEqualTo("guest-sid");
    }

    @Test
    void noSessionFallsThroughToPreRegistration() throws Exception {
        when(userService.findByProviderAndSubject(AuthProvider.GOOGLE, SUB))
                .thenReturn(Optional.empty());

        handler.onAuthenticationSuccess(oauthCallbackRequest(), new MockHttpServletResponse(), oauthToken());

        AmbiPrincipal seed = captureRotateSeed();
        assertThat(seed.state()).isEqualTo(IdentityState.PRE_REGISTRATION);
        assertThat(seed.userId()).isNull();
        assertThat(seed.userLevel()).isNull();
        assertThat(seed.provider()).isEqualTo(AuthProvider.GOOGLE);
        assertThat(seed.externalProviderId()).isEqualTo(SUB);
        assertThat(seed.email()).isEqualTo(EMAIL);
        verify(userService, never()).upgradeGuestToRegistered(any(), any(), any(), any());
    }

    @Test
    void staleGuestSessionFallsThroughToPreRegistration() throws Exception {
        when(userService.findByProviderAndSubject(AuthProvider.GOOGLE, SUB))
                .thenReturn(Optional.empty());

        UserSession guestSession = guestSession("guest-sid", "u-gone");
        when(tokenService.validate("guest-jwt")).thenReturn(Optional.of(guestSession));
        // Guest User vanished (TTL'd / deleted between sessions) → no upgrade.
        when(userService.findById("u-gone")).thenReturn(Optional.empty());

        MockHttpServletRequest request = oauthCallbackRequest();
        request.setCookies(new Cookie(props.getCookie().getAccessName(), "guest-jwt"));

        handler.onAuthenticationSuccess(request, new MockHttpServletResponse(), oauthToken());

        verify(userService, never()).upgradeGuestToRegistered(any(), any(), any(), any());
        AmbiPrincipal seed = captureRotateSeed();
        assertThat(seed.state()).isEqualTo(IdentityState.PRE_REGISTRATION);
    }

    @Test
    void writesAccessAndRefreshCookiesAndRedirectsPreRegistrationToRegister() throws Exception {
        when(userService.findByProviderAndSubject(any(), any())).thenReturn(Optional.empty());

        MockHttpServletResponse response = new MockHttpServletResponse();
        handler.onAuthenticationSuccess(oauthCallbackRequest(), response, oauthToken());

        List<String> setCookie = response.getHeaders("Set-Cookie");
        assertThat(setCookie).anyMatch(c -> c.startsWith("AMBI_AT=acc"));
        assertThat(setCookie).anyMatch(c -> c.startsWith("AMBI_RT=ref"));
        // No returnUrl cookie and no account yet → straight to registration.
        assertThat(response.getRedirectedUrl()).isEqualTo("http://localhost:5173/register");
    }

    @Test
    void preRegistrationKeepsReturnUrlAsRegisterSearchParamAndClearsCookie() throws Exception {
        when(userService.findByProviderAndSubject(any(), any())).thenReturn(Optional.empty());

        MockHttpServletRequest request = oauthCallbackRequest();
        request.setCookies(new Cookie(OAuthReturnUrlCaptureFilter.COOKIE_NAME, "/decks/abc"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationSuccess(request, response, oauthToken());

        // The blocked destination survives registration as an encoded search param.
        assertThat(response.getRedirectedUrl())
                .isEqualTo("http://localhost:5173/register?returnUrl=%2Fdecks%2Fabc");
        // The clear-cookie Set-Cookie is the one with Max-Age=0.
        assertThat(response.getHeaders("Set-Cookie"))
                .anyMatch(c -> c.startsWith(OAuthReturnUrlCaptureFilter.COOKIE_NAME + "=")
                        && c.contains("Max-Age=0"));
    }

    @Test
    void registeredUserWithoutReturnUrlLandsOnWorkspace() throws Exception {
        when(userService.findByProviderAndSubject(AuthProvider.GOOGLE, SUB))
                .thenReturn(Optional.of(registeredUser("u-1", UserLevel.USER, false)));

        MockHttpServletResponse response = new MockHttpServletResponse();
        handler.onAuthenticationSuccess(oauthCallbackRequest(), response, oauthToken());

        // Returning user has no use for the marketing page — send them to /decks.
        assertThat(response.getRedirectedUrl()).isEqualTo("http://localhost:5173/decks");
    }

    @Test
    void registeredUserWithDeepReturnUrlPassesThroughUntouched() throws Exception {
        when(userService.findByProviderAndSubject(AuthProvider.GOOGLE, SUB))
                .thenReturn(Optional.of(registeredUser("u-1", UserLevel.USER, false)));

        MockHttpServletRequest request = oauthCallbackRequest();
        request.setCookies(new Cookie(OAuthReturnUrlCaptureFilter.COOKIE_NAME, "/decks/abc/edit"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationSuccess(request, response, oauthToken());

        assertThat(response.getRedirectedUrl()).isEqualTo("http://localhost:5173/decks/abc/edit");
    }

    @Test
    void unsafeReturnUrlInCookieIsCoercedToStateDefault() throws Exception {
        // Defense-in-depth: even if something gets into the cookie, sanitize wins
        // and the state-aware default (register, for PRE_REGISTRATION) applies.
        when(userService.findByProviderAndSubject(any(), any())).thenReturn(Optional.empty());

        MockHttpServletRequest request = oauthCallbackRequest();
        request.setCookies(new Cookie(OAuthReturnUrlCaptureFilter.COOKIE_NAME, "//evil.tld/path"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationSuccess(request, response, oauthToken());

        assertThat(response.getRedirectedUrl()).isEqualTo("http://localhost:5173/register");
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private AmbiPrincipal captureRotateSeed() {
        ArgumentCaptor<AmbiPrincipal> captor = ArgumentCaptor.forClass(AmbiPrincipal.class);
        verify(tokenService).rotate(any(), captor.capture(), anyBoolean());
        return captor.getValue();
    }

    private static MockHttpServletRequest oauthCallbackRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/login/oauth2/code/google");
        request.setRequestURI("/login/oauth2/code/google");
        return request;
    }

    private static OAuth2AuthenticationToken oauthToken() {
        Map<String, Object> attrs = Map.of(
                "sub", SUB,
                "email", EMAIL,
                "name", "Test User");
        OAuth2User principal = new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("OAUTH2_USER")), attrs, "sub");
        return new OAuth2AuthenticationToken(principal, principal.getAuthorities(), "google");
    }

    private static User registeredUser(String id, UserLevel level, boolean closed) {
        User u = new User();
        u.setId(id);
        u.setPublicId("pub-" + id);
        u.setUsername("user-" + id);
        u.setUserLevel(level);
        u.setClosed(closed);
        return u;
    }

    private static User guestUser(String id) {
        User u = new User();
        u.setId(id);
        u.setPublicId("pub-" + id);
        u.setUsername("guest-" + id);
        u.setUserLevel(UserLevel.GUEST);
        return u;
    }

    private static UserSession guestSession(String sessionId, String userId) {
        UserSession session = new UserSession();
        session.setSessionId(sessionId);
        session.setUserId(userId);
        session.setState(IdentityState.GUEST);
        session.setProvider(AuthProvider.INTERNAL);
        session.setUserLevel(UserLevel.GUEST);
        return session;
    }
}
