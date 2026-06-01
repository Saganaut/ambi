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
import com.cephadex.ambi.common.exception.UnauthorizedException;
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

    /**
     * Slides a session via {@code /refresh} (Inv 6): consumes the caller's
     * refresh token and returns fresh access + refresh tokens for the same
     * session, plus a {@link MeResponse} hydrated from the live {@link User}
     * (so a lapsed entitlement, ban, or level change takes effect immediately
     * — Inv 7). Throws {@link UnauthorizedException} on any failure;
     * {@code GlobalExceptionHandler} maps that to 401 and the SPA opens the
     * login modal.
     */
    public AuthSession refresh(String refreshToken) {
        RedisTokenSessionService.RefreshResult result = tokenService.refresh(refreshToken)
                .orElseThrow(() -> new UnauthorizedException("REFRESH_FAILED",
                        "Session expired or refresh token invalid; please sign in again."));
        return new AuthSession(result.tokens(), meFromRefreshedSession(result.session()));
    }

    private MeResponse meFromRefreshedSession(UserSession session) {
        IdentityState state = session.getState();
        if (state == IdentityState.PRE_REGISTRATION) {
            // No backing User — identity comes entirely from the session.
            return new MeResponse(true, IdentityState.PRE_REGISTRATION, true,
                    null, null, null, session.getEmail(), null, null, null);
        }
        return userService.findById(session.getUserId())
                .map(user -> meFromUser(state, user))
                .orElseThrow(() -> new UnauthorizedException("REFRESH_USER_GONE",
                        "Account no longer exists; please sign in again."));
    }

    /**
     * Reports whether a desired username is free, backing the registration
     * screen's live availability check. Thin delegate to {@link UserService}:
     * the {@code uniq_username} index stays the authority (Inv 9), so a
     * {@code true} is advisory and can still lose a race at {@link #register}.
     */
    public boolean isUsernameAvailable(String username) {
        return userService.isUsernameAvailable(username);
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
        // Entitlement is a billing-domain rule (Inv 7); the service only handles
        // the null-billing case and assembles the DTO.
        MembershipStatus status = billing != null ? billing.getStatus() : MembershipStatus.NONE;
        MembershipTier tier = billing != null ? billing.effectiveTier() : MembershipTier.FREE;
        return new MeResponse(
                true,
                state,
                false,
                user.getPublicId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getEmailAddress(),
                user.getUserLevel(),
                tier,
                status);
    }
}
