package com.cephadex.ambi.auth.security;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * The authenticated principal placed in the {@code SecurityContext} for a
 * request. Immutable and independent of how it was minted (cookie filter today,
 * OAuth success handler in Phase 2), so tests can construct one directly.
 *
 * <p>{@code userLevel} is {@code null} whenever there is no backing {@code User}
 * ({@code VISITOR}, {@code PRE_REGISTRATION}). It is <strong>never</strong>
 * defaulted to {@code USER} — see {@link com.cephadex.ambi.auth.service.AuthorityResolver} and Inv 8.
 *
 * @param state              the identity state for this request
 * @param userId             Mongo {@code _id}; {@code null} for visitor/preRegistration
 * @param publicId           public user id; {@code null} when no {@code User}
 * @param userLevel          account level; {@code null} when no {@code User}
 * @param provider           auth provider (set for guest=INTERNAL, preReg, registered)
 * @param externalProviderId provider subject id; {@code null} for INTERNAL/guest
 * @param email              email; present for preRegistration (from session) and registered
 * @param sessionId          the Redis session handle backing this principal
 */
public record AmbiPrincipal(
        IdentityState state,
        String userId,
        String publicId,
        UserLevel userLevel,
        AuthProvider provider,
        String externalProviderId,
        String email,
        String sessionId) {

    /** Stable, DB-free name for logging/MDC: userId if persisted, else the session handle. */
    public String name() {
        return userId != null ? userId : sessionId;
    }
}
