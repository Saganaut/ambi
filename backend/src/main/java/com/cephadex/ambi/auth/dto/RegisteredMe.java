package com.cephadex.ambi.auth.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.billing.enums.MembershipStatus;
import com.cephadex.ambi.billing.enums.MembershipTier;
import com.cephadex.ambi.user.enums.UserLevel;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Fully registered account — provider auth, verified email, persisted profile.
 * Every field is guaranteed present.
 *
 * @param state             always {@link IdentityState#REGISTERED}.
 * @param authenticated     always {@code true}.
 * @param needsRegistration always {@code false}.
 * @param publicId          stable public identifier.
 * @param username          unique account handle.
 * @param displayName       display name (defaults to the username).
 * @param email             verified email address.
 * @param userLevel         account level (USER and above).
 * @param effectiveTier     live entitlement tier (Inv 7).
 * @param membershipStatus  live membership status.
 */
public record RegisteredMe(
        @Schema(requiredMode = REQUIRED) IdentityState state,
        @Schema(requiredMode = REQUIRED) boolean authenticated,
        @Schema(requiredMode = REQUIRED) boolean needsRegistration,
        @Schema(requiredMode = REQUIRED) String publicId,
        @Schema(requiredMode = REQUIRED) String username,
        @Schema(requiredMode = REQUIRED) String displayName,
        @Schema(requiredMode = REQUIRED) String email,
        @Schema(requiredMode = REQUIRED) UserLevel userLevel,
        @Schema(requiredMode = REQUIRED) MembershipTier effectiveTier,
        @Schema(requiredMode = REQUIRED) MembershipStatus membershipStatus)
        implements MeResponse {

    public RegisteredMe(String publicId, String username, String displayName, String email,
            UserLevel userLevel, MembershipTier effectiveTier, MembershipStatus membershipStatus) {
        this(IdentityState.REGISTERED, true, false, publicId, username, displayName, email,
                userLevel, effectiveTier, membershipStatus);
    }
}
