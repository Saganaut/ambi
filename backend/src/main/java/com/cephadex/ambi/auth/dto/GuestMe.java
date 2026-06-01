package com.cephadex.ambi.auth.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.billing.enums.MembershipStatus;
import com.cephadex.ambi.billing.enums.MembershipTier;
import com.cephadex.ambi.user.enums.UserLevel;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Ephemeral guest — a persisted {@code INTERNAL} {@link com.cephadex.ambi.user.User}
 * with no email. Has a public profile and entitlement, but no {@code email}.
 *
 * @param state             always {@link IdentityState#GUEST}.
 * @param authenticated     always {@code true}.
 * @param needsRegistration always {@code false}.
 * @param publicId          stable public identifier.
 * @param username          generated guest handle.
 * @param displayName       display name (defaults to the username).
 * @param userLevel         always {@link UserLevel#GUEST}.
 * @param effectiveTier     live entitlement tier (Inv 7).
 * @param membershipStatus  live membership status.
 */
public record GuestMe(
        @Schema(requiredMode = REQUIRED) IdentityState state,
        @Schema(requiredMode = REQUIRED) boolean authenticated,
        @Schema(requiredMode = REQUIRED) boolean needsRegistration,
        @Schema(requiredMode = REQUIRED) String publicId,
        @Schema(requiredMode = REQUIRED) String username,
        @Schema(requiredMode = REQUIRED) String displayName,
        @Schema(requiredMode = REQUIRED) UserLevel userLevel,
        @Schema(requiredMode = REQUIRED) MembershipTier effectiveTier,
        @Schema(requiredMode = REQUIRED) MembershipStatus membershipStatus)
        implements MeResponse {

    public GuestMe(String publicId, String username, String displayName,
            UserLevel userLevel, MembershipTier effectiveTier, MembershipStatus membershipStatus) {
        this(IdentityState.GUEST, true, false, publicId, username, displayName,
                userLevel, effectiveTier, membershipStatus);
    }
}
