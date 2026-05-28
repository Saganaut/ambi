package com.cephadex.ambi.auth.service;

import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.dto.MeResponse;
import com.cephadex.ambi.auth.dto.RegisterRequest;
import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.billing.BillingState;
import com.cephadex.ambi.billing.Membership;
import com.cephadex.ambi.billing.enums.MembershipStatus;
import com.cephadex.ambi.billing.enums.MembershipTier;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.UserService;

/**
 * Orchestrates the always-available auth flows (guest create, logout) and
 * resolves the {@code /me} view across the four identity states. Session/cookie
 * mechanics live in {@link RedisTokenSessionService}; user persistence lives in
 * {@link UserService}.
 */
@Service
public class AuthService {

    private final UserService userService;
    private final RedisTokenSessionService tokenService;

    public AuthService(UserService userService, RedisTokenSessionService tokenService) {
        this.userService = userService;
        this.tokenService = tokenService;
    }

    /** A minted session (cookies to set) paired with the {@code /me} body to return. */
    public record AuthSession(RedisTokenSessionService.Tokens tokens, MeResponse me) {
    }

    /**
     * Creates a guest user and a fresh session for it. The session id is rotated
     * at this visitor→guest privilege boundary (Inv 4): a new token is minted and
     * the caller's previous session (if any) is invalidated.
     */
    public AuthSession createGuest(String currentSessionId) {
        User guest = userService.createGuest();
        AmbiPrincipal seed = new AmbiPrincipal(
                IdentityState.GUEST, guest.getId(), guest.getPublicId(), guest.getUserLevel(),
                AuthProvider.INTERNAL, null, null, null);
        // Guests are never "stay logged in".
        RedisTokenSessionService.Tokens tokens = tokenService.rotate(currentSessionId, seed, false);
        return new AuthSession(tokens, meFromUser(IdentityState.GUEST, guest));
    }

    /**
     * Completes a {@code PRE_REGISTRATION} session into a registered account
     * and rotates the session id at the privilege boundary (Inv 4). Identity
     * ({@code provider}, {@code externalProviderId}, {@code email}) is taken
     * <strong>only</strong> from the session principal (Inv 5): the request body
     * carries solely user-chosen fields.
     *
     * <p>Idempotent (Inv 8): if a {@link User} already exists for the session's
     * {@code (provider, externalProviderId)} pair, it is returned (reopening if
     * closed) and the body's {@code username} is ignored — back-button /
     * double-submit / a race with another tab all converge on the same account.
     */
    public AuthSession register(AmbiPrincipal principal, RegisterRequest request) {
        if (principal == null || principal.state() != IdentityState.PRE_REGISTRATION) {
            // The filter chain already enforces hasRole(PRE_REGISTRATION); this
            // is a belt-and-braces guard so service-level reuse stays safe.
            throw new ForbiddenException("REGISTRATION_NOT_ALLOWED",
                    "Registration requires a pre-registration session.");
        }
        AuthProvider provider = principal.provider();
        String externalProviderId = principal.externalProviderId();
        String email = principal.email();

        User user = userService.findByProviderAndSubject(provider, externalProviderId)
                .map(existing -> existing.isClosed() ? userService.reopen(existing) : existing)
                .orElseGet(() -> userService.register(
                        provider, externalProviderId, email,
                        request.username(), request.displayName()));

        AmbiPrincipal seed = new AmbiPrincipal(
                IdentityState.REGISTERED,
                user.getId(), user.getPublicId(), user.getUserLevel(),
                provider, externalProviderId, email, null);
        // Phase 2.5: "stay logged in" will surface persistent here.
        RedisTokenSessionService.Tokens tokens = tokenService.rotate(principal.sessionId(), seed, false);
        return new AuthSession(tokens, meFromUser(IdentityState.REGISTERED, user));
    }

    /** Revokes the session in Redis so the token is rejected on the next request. Idempotent. */
    public void logout(String sessionId) {
        tokenService.revoke(sessionId);
    }

    /** Builds the {@code /me} payload for the current principal (null = visitor). */
    public MeResponse resolveMe(AmbiPrincipal principal) {
        if (principal == null || principal.state() == IdentityState.VISITOR) {
            return MeResponse.visitor();
        }
        return switch (principal.state()) {
            case VISITOR -> MeResponse.visitor();
            case PRE_REGISTRATION -> new MeResponse(true, IdentityState.PRE_REGISTRATION, true,
                    null, null, null, principal.email(), null, null, null);
            case GUEST, REGISTERED -> userService.findById(principal.userId())
                    .map(user -> meFromUser(principal.state(), user))
                    // Session valid but User vanished — surface as visitor.
                    .orElseGet(MeResponse::visitor);
        };
    }

    private MeResponse meFromUser(IdentityState state, User user) {
        Membership membership = user.getMembership();
        BillingState billing = membership != null ? membership.getBilling() : null;
        MembershipStatus status = billing != null ? billing.getStatus() : MembershipStatus.NONE;
        return new MeResponse(
                true,
                state,
                false,
                user.getPublicId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getEmailAddress(),
                user.getUserLevel(),
                effectiveTier(billing),
                status);
    }

    /**
     * Live entitlement (Inv 7): any status other than {@code ACTIVE}/{@code TRIALING}
     * collapses to {@code FREE} regardless of the stored tier. Evaluated at request
     * time (the filter loaded the live User), so a lapse/upgrade takes effect on
     * the next request with no re-login.
     */
    private MembershipTier effectiveTier(BillingState billing) {
        if (billing == null || billing.getTier() == null) {
            return MembershipTier.FREE;
        }
        MembershipStatus status = billing.getStatus();
        boolean entitled = status == MembershipStatus.ACTIVE || status == MembershipStatus.TRIALING;
        return entitled ? billing.getTier() : MembershipTier.FREE;
    }
}
