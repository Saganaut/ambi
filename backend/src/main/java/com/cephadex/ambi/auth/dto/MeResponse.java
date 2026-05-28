package com.cephadex.ambi.auth.dto;

import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.billing.enums.MembershipStatus;
import com.cephadex.ambi.billing.enums.MembershipTier;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * The {@code GET /api/auth/me} payload. One shape expresses all four identity
 * states via the {@code state} discriminator plus nullability; the frontend
 * branches on {@code state} (and on {@code needsRegistration} to route a
 * preRegistration principal to the registration screen).
 *
 * <ul>
 *   <li>VISITOR — {@code authenticated=false}, everything else null/false.</li>
 *   <li>GUEST — {@code userLevel=GUEST}, {@code effectiveTier=FREE}.</li>
 *   <li>PRE_REGISTRATION — {@code needsRegistration=true}, {@code email}/provider
 *       set, no {@code publicId}/{@code username}, {@code userLevel=null}.</li>
 *   <li>REGISTERED — full profile + live {@code effectiveTier} (Inv 7).</li>
 * </ul>
 */
public record MeResponse(
        boolean authenticated,
        IdentityState state,
        boolean needsRegistration,
        String publicId,
        String username,
        String displayName,
        String email,
        UserLevel userLevel,
        MembershipTier effectiveTier,
        MembershipStatus membershipStatus) {

    /** The visitor (no session) payload. */
    public static MeResponse visitor() {
        return new MeResponse(false, IdentityState.VISITOR, false,
                null, null, null, null, null, null, null);
    }
}
