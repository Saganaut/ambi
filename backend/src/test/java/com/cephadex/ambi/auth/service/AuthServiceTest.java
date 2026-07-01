package com.cephadex.ambi.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.cephadex.ambi.auth.dto.GuestMe;
import com.cephadex.ambi.auth.dto.MeResponse;
import com.cephadex.ambi.auth.dto.PreRegistrationMe;
import com.cephadex.ambi.auth.dto.RegisterRequest;
import com.cephadex.ambi.auth.dto.RegisteredMe;
import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.billing.BillingState;
import com.cephadex.ambi.billing.Membership;
import com.cephadex.ambi.billing.enums.MembershipStatus;
import com.cephadex.ambi.billing.enums.MembershipTier;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.UnauthorizedException;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.UserService;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Covers the four-state {@code /me} resolution, the Inv-7 live-entitlement
 * collapse, and the Inv-4 session rotation on guest creation.
 */
class AuthServiceTest {

    @Mock
    private UserService userService;
    @Mock
    private RedisTokenSessionService tokenService;

    private AuthService authService;
    private AutoCloseable mocks;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
        authService = new AuthService(userService, tokenService);
    }

    @Test
    void nullPrincipalResolvesToVisitor() {
        MeResponse me = authService.resolveMe(null);
        assertThat(me.authenticated()).isFalse();
        assertThat(me.state()).isEqualTo(IdentityState.VISITOR);
        assertThat(me.needsRegistration()).isFalse();
    }

    @Test
    void preRegistrationResolvesToNeedsRegistration() {
        AmbiPrincipal principal = new AmbiPrincipal(IdentityState.PRE_REGISTRATION, null, null, null,
                AuthProvider.GOOGLE, "google-sub-1", "new@example.com", "sid");

        MeResponse me = authService.resolveMe(principal);

        assertThat(me.authenticated()).isTrue();
        assertThat(me.state()).isEqualTo(IdentityState.PRE_REGISTRATION);
        assertThat(me.needsRegistration()).isTrue();
        // The union guarantees a preReg payload carries only the email — there
        // are no publicId/userLevel fields on the type to be null.
        assertThat(me).isInstanceOfSatisfying(PreRegistrationMe.class,
                p -> assertThat(p.email()).isEqualTo("new@example.com"));
    }

    @Test
    void guestResolvesWithFreeTier() {
        User guest = user("guest-1", UserLevel.GUEST, MembershipStatus.NONE, MembershipTier.FREE);
        when(userService.findById("guest-1")).thenReturn(Optional.of(guest));

        MeResponse me = authService.resolveMe(principalFor(IdentityState.GUEST, "guest-1"));

        assertThat(me.state()).isEqualTo(IdentityState.GUEST);
        assertThat(me).isInstanceOfSatisfying(GuestMe.class, g -> {
            assertThat(g.userLevel()).isEqualTo(UserLevel.GUEST);
            assertThat(g.effectiveTier()).isEqualTo(MembershipTier.FREE);
        });
    }

    @Test
    void lapsedEntitlementCollapsesToFree() {
        // Stored tier INDIVIDUAL but status PAST_DUE → effective FREE (Inv 7).
        User user = user("u1", UserLevel.USER, MembershipStatus.PAST_DUE, MembershipTier.INDIVIDUAL);
        when(userService.findById("u1")).thenReturn(Optional.of(user));

        MeResponse me = authService.resolveMe(principalFor(IdentityState.REGISTERED, "u1"));

        assertThat(me).isInstanceOfSatisfying(RegisteredMe.class, r -> {
            assertThat(r.membershipStatus()).isEqualTo(MembershipStatus.PAST_DUE);
            assertThat(r.effectiveTier()).isEqualTo(MembershipTier.FREE);
        });
    }

    @Test
    void activeEntitlementKeepsTier() {
        User user = user("u2", UserLevel.USER, MembershipStatus.ACTIVE, MembershipTier.INDIVIDUAL);
        when(userService.findById("u2")).thenReturn(Optional.of(user));

        MeResponse me = authService.resolveMe(principalFor(IdentityState.REGISTERED, "u2"));

        assertThat(me).isInstanceOfSatisfying(RegisteredMe.class,
                r -> assertThat(r.effectiveTier()).isEqualTo(MembershipTier.INDIVIDUAL));
    }

    @Test
    void createGuestRotatesSessionAndReturnsGuestMe() {
        User guest = user("g9", UserLevel.GUEST, MembershipStatus.NONE, MembershipTier.FREE);
        when(userService.createGuest()).thenReturn(guest);
        when(tokenService.rotate(eq("old-sid"), any(), eq(false)))
                .thenReturn(new RedisTokenSessionService.Tokens("at", "rt", "new-sid", false));

        AuthService.AuthSession session = authService.createGuest("old-sid");

        assertThat(session.me().state()).isEqualTo(IdentityState.GUEST);
        assertThat(session.tokens().sessionId()).isEqualTo("new-sid");
        // Rotation happens at the visitor→guest privilege boundary, never persistent.
        verify(tokenService).rotate(eq("old-sid"), any(), eq(false));
    }

    @Test
    void logoutRevokesSession() {
        authService.logout("sid-1");
        verify(tokenService).revoke("sid-1");
    }

    @Test
    void createGuestFromVisitorPassesNullOldSession() {
        User guest = user("g0", UserLevel.GUEST, MembershipStatus.NONE, MembershipTier.FREE);
        when(userService.createGuest()).thenReturn(guest);
        when(tokenService.rotate(isNull(), any(), eq(false)))
                .thenReturn(new RedisTokenSessionService.Tokens("at", "rt", "sid", false));

        authService.createGuest(null);

        verify(tokenService).rotate(isNull(), any(), eq(false));
    }

    // ── devLogin (DEV-only screenshot/verification account) ──────────────────

    @Test
    void devLoginReusesExistingDevUser() {
        User existing = user("dev-1", UserLevel.USER, MembershipStatus.NONE, MembershipTier.FREE);
        when(userService.findByProviderAndSubject(AuthProvider.INTERNAL, "dev-login"))
                .thenReturn(Optional.of(existing));
        // Persistent session (true) so the screenshot session outlives the access TTL.
        when(tokenService.rotate(isNull(), any(), eq(true)))
                .thenReturn(new RedisTokenSessionService.Tokens("at", "rt", "dev-sid", true));

        AuthService.AuthSession session = authService.devLogin();

        assertThat(session.me().state()).isEqualTo(IdentityState.REGISTERED);
        assertThat(session.tokens().sessionId()).isEqualTo("dev-sid");
        // Idempotent: an existing dev user is never re-registered.
        verify(userService, never()).register(any(), any(), any(), any(), any());
        verify(tokenService).rotate(isNull(), any(), eq(true));
    }

    @Test
    void devLoginCreatesDevUserOnFirstCall() {
        User created = user("dev-new", UserLevel.USER, MembershipStatus.NONE, MembershipTier.FREE);
        when(userService.findByProviderAndSubject(AuthProvider.INTERNAL, "dev-login"))
                .thenReturn(Optional.empty());
        when(userService.register(AuthProvider.INTERNAL, "dev-login", "dev@ambi.local",
                "devuser", "Dev User")).thenReturn(created);
        when(tokenService.rotate(isNull(), any(), eq(true)))
                .thenReturn(new RedisTokenSessionService.Tokens("at", "rt", "dev-sid", true));

        AuthService.AuthSession session = authService.devLogin();

        assertThat(session.me().state()).isEqualTo(IdentityState.REGISTERED);
        // The fixed dev identity is created exactly once, with the constants above.
        verify(userService).register(AuthProvider.INTERNAL, "dev-login", "dev@ambi.local",
                "devuser", "Dev User");
        verify(tokenService).rotate(isNull(), any(), eq(true));
    }

    // ── register (Phase 2) ───────────────────────────────────────────────────

    @Test
    void registerCreatesUserAndRotatesSession() {
        AmbiPrincipal preReg = preRegistrationPrincipal();
        User created = user("u-new", UserLevel.USER, MembershipStatus.NONE, MembershipTier.FREE);
        when(userService.findByProviderAndSubject(AuthProvider.GOOGLE, "google-sub-1"))
                .thenReturn(Optional.empty());
        when(userService.register(AuthProvider.GOOGLE, "google-sub-1", "new@example.com",
                "newname", "New Person")).thenReturn(created);
        when(tokenService.rotate(eq("pre-sid"), any(), eq(false)))
                .thenReturn(new RedisTokenSessionService.Tokens("at", "rt", "new-sid", false));

        AuthService.AuthSession session = authService.register(preReg,
                new RegisterRequest("newname", "New Person", true));

        assertThat(session.me().state()).isEqualTo(IdentityState.REGISTERED);
        assertThat(session.me()).isInstanceOfSatisfying(RegisteredMe.class,
                r -> assertThat(r.username()).isEqualTo("name-u-new"));
        verify(tokenService).rotate(eq("pre-sid"), any(), eq(false));
        verify(userService, never()).reopen(any());
    }

    @Test
    void registerIsIdempotentForExistingUser() {
        // Same (provider, sub) — return the existing User and ignore the username
        // in the body (Inv 8). Don't call register again.
        AmbiPrincipal preReg = preRegistrationPrincipal();
        User existing = user("u-existing", UserLevel.USER, MembershipStatus.ACTIVE, MembershipTier.INDIVIDUAL);
        when(userService.findByProviderAndSubject(AuthProvider.GOOGLE, "google-sub-1"))
                .thenReturn(Optional.of(existing));
        when(tokenService.rotate(eq("pre-sid"), any(), eq(false)))
                .thenReturn(new RedisTokenSessionService.Tokens("at", "rt", "new-sid", false));

        AuthService.AuthSession session = authService.register(preReg,
                new RegisterRequest("ignored-username", null, false));

        assertThat(session.me().state()).isEqualTo(IdentityState.REGISTERED);
        assertThat(session.me()).isInstanceOfSatisfying(RegisteredMe.class,
                r -> assertThat(r.effectiveTier()).isEqualTo(MembershipTier.INDIVIDUAL));
        verify(userService, never()).register(any(), any(), any(), any(), any());
        verify(userService, never()).reopen(any());
    }

    @Test
    void registerReopensClosedExistingUser() {
        AmbiPrincipal preReg = preRegistrationPrincipal();
        User closed = user("u-closed", UserLevel.USER, MembershipStatus.NONE, MembershipTier.FREE);
        closed.setClosed(true);
        User reopened = user("u-closed", UserLevel.USER, MembershipStatus.NONE, MembershipTier.FREE);
        when(userService.findByProviderAndSubject(AuthProvider.GOOGLE, "google-sub-1"))
                .thenReturn(Optional.of(closed));
        when(userService.reopen(closed)).thenReturn(reopened);
        when(tokenService.rotate(eq("pre-sid"), any(), eq(false)))
                .thenReturn(new RedisTokenSessionService.Tokens("at", "rt", "new-sid", false));

        AuthService.AuthSession session = authService.register(preReg,
                new RegisterRequest("ignored", null, false));

        verify(userService).reopen(closed);
        verify(userService, never()).register(any(), any(), any(), any(), any());
        assertThat(session.me().state()).isEqualTo(IdentityState.REGISTERED);
    }

    @Test
    void registerRejectsNonPreRegistrationPrincipal() {
        // The filter chain enforces hasRole(PRE_REGISTRATION); this is the
        // belt-and-braces service-level guard.
        AmbiPrincipal guest = new AmbiPrincipal(IdentityState.GUEST, "g-1", "pub-g-1", UserLevel.GUEST,
                AuthProvider.INTERNAL, null, null, "sid");

        assertThatThrownBy(() -> authService.register(guest, new RegisterRequest("u", null, false)))
                .isInstanceOf(ForbiddenException.class);
        verify(userService, never()).register(any(), any(), any(), any(), any());
        verify(tokenService, never()).rotate(any(), any(), any(Boolean.class));
    }

    private static AmbiPrincipal preRegistrationPrincipal() {
        return new AmbiPrincipal(IdentityState.PRE_REGISTRATION, null, null, null,
                AuthProvider.GOOGLE, "google-sub-1", "new@example.com", "pre-sid");
    }

    // ── refresh (Phase 2 chunk 2) ────────────────────────────────────────────

    @Test
    void refreshHappyPathReturnsLiveMeResponse() {
        // Lapsed entitlement collapses to FREE live (Inv 7) — even on refresh.
        User user = user("u-r", UserLevel.USER, MembershipStatus.PAST_DUE, MembershipTier.INDIVIDUAL);
        UserSession session = userSession("sid-r", IdentityState.REGISTERED, "u-r");
        when(tokenService.refresh("rt-1")).thenReturn(Optional.of(
                new RedisTokenSessionService.RefreshResult(
                        new RedisTokenSessionService.Tokens("at-2", "rt-2", "sid-r", false), session)));
        when(userService.findById("u-r")).thenReturn(Optional.of(user));

        AuthService.AuthSession out = authService.refresh("rt-1");

        assertThat(out.tokens().refreshToken()).isEqualTo("rt-2");
        assertThat(out.me().state()).isEqualTo(IdentityState.REGISTERED);
        assertThat(out.me()).isInstanceOfSatisfying(RegisteredMe.class,
                r -> assertThat(r.effectiveTier()).isEqualTo(MembershipTier.FREE));
    }

    @Test
    void refreshFailureSurfacesAs401() {
        when(tokenService.refresh("bad-rt")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh("bad-rt"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Session expired");
    }

    @Test
    void refreshOfPreRegistrationBuildsNeedsRegistrationMe() {
        // A preReg session can keep itself alive via /refresh while the user
        // is on the registration screen; no User to hydrate.
        UserSession session = new UserSession("sid-p", IdentityState.PRE_REGISTRATION, null,
                AuthProvider.GOOGLE, "g-sub", "p@example.com", null, false, "fam", 0L);
        when(tokenService.refresh("rt-p")).thenReturn(Optional.of(
                new RedisTokenSessionService.RefreshResult(
                        new RedisTokenSessionService.Tokens("at", "rt-p2", "sid-p", false), session)));

        AuthService.AuthSession out = authService.refresh("rt-p");

        assertThat(out.me().state()).isEqualTo(IdentityState.PRE_REGISTRATION);
        assertThat(out.me().needsRegistration()).isTrue();
        assertThat(out.me()).isInstanceOfSatisfying(PreRegistrationMe.class,
                p -> assertThat(p.email()).isEqualTo("p@example.com"));
        verify(userService, never()).findById(any());
    }

    @Test
    void refreshSucceedsButUserGoneSurfacesAs401() {
        // Possible race: session still alive, but the User document was deleted
        // (e.g. account close + reap). The session is no longer redeemable.
        UserSession session = userSession("sid-g", IdentityState.REGISTERED, "u-gone");
        when(tokenService.refresh("rt-g")).thenReturn(Optional.of(
                new RedisTokenSessionService.RefreshResult(
                        new RedisTokenSessionService.Tokens("at", "rt-g2", "sid-g", false), session)));
        when(userService.findById("u-gone")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh("rt-g"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Account no longer exists");
    }

    private static UserSession userSession(String sessionId, IdentityState state, String userId) {
        UserSession s = new UserSession();
        s.setSessionId(sessionId);
        s.setState(state);
        s.setUserId(userId);
        s.setProvider(AuthProvider.GOOGLE);
        s.setUserLevel(UserLevel.USER);
        return s;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static AmbiPrincipal principalFor(IdentityState state, String userId) {
        return new AmbiPrincipal(state, userId, "pub-" + userId, UserLevel.USER,
                AuthProvider.GOOGLE, "ext", "user@example.com", "sid");
    }

    private static User user(String id, UserLevel level, MembershipStatus status, MembershipTier tier) {
        BillingState billing = new BillingState();
        billing.setStatus(status);
        billing.setTier(tier);
        Membership membership = new Membership();
        membership.setBilling(billing);

        User user = new User();
        user.setId(id);
        user.setPublicId("pub-" + id);
        user.setUsername("name-" + id);
        user.setDisplayName("Display " + id);
        user.setEmailAddress(id + "@example.com");
        user.setUserLevel(level);
        user.setMembership(membership);
        return user;
    }

    @org.junit.jupiter.api.AfterEach
    void tearDown() throws Exception {
        mocks.close();
    }
}
