package com.cephadex.ambi.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.cephadex.ambi.auth.dto.MeResponse;
import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.billing.BillingState;
import com.cephadex.ambi.billing.Membership;
import com.cephadex.ambi.billing.enums.MembershipStatus;
import com.cephadex.ambi.billing.enums.MembershipTier;
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
        assertThat(me.email()).isEqualTo("new@example.com");
        assertThat(me.userLevel()).isNull();
        assertThat(me.publicId()).isNull();
    }

    @Test
    void guestResolvesWithFreeTier() {
        User guest = user("guest-1", UserLevel.GUEST, MembershipStatus.NONE, MembershipTier.FREE);
        when(userService.findById("guest-1")).thenReturn(Optional.of(guest));

        MeResponse me = authService.resolveMe(principalFor(IdentityState.GUEST, "guest-1"));

        assertThat(me.state()).isEqualTo(IdentityState.GUEST);
        assertThat(me.userLevel()).isEqualTo(UserLevel.GUEST);
        assertThat(me.effectiveTier()).isEqualTo(MembershipTier.FREE);
    }

    @Test
    void lapsedEntitlementCollapsesToFree() {
        // Stored tier INDIVIDUAL but status PAST_DUE → effective FREE (Inv 7).
        User user = user("u1", UserLevel.USER, MembershipStatus.PAST_DUE, MembershipTier.INDIVIDUAL);
        when(userService.findById("u1")).thenReturn(Optional.of(user));

        MeResponse me = authService.resolveMe(principalFor(IdentityState.REGISTERED, "u1"));

        assertThat(me.membershipStatus()).isEqualTo(MembershipStatus.PAST_DUE);
        assertThat(me.effectiveTier()).isEqualTo(MembershipTier.FREE);
    }

    @Test
    void activeEntitlementKeepsTier() {
        User user = user("u2", UserLevel.USER, MembershipStatus.ACTIVE, MembershipTier.INDIVIDUAL);
        when(userService.findById("u2")).thenReturn(Optional.of(user));

        MeResponse me = authService.resolveMe(principalFor(IdentityState.REGISTERED, "u2"));

        assertThat(me.effectiveTier()).isEqualTo(MembershipTier.INDIVIDUAL);
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
