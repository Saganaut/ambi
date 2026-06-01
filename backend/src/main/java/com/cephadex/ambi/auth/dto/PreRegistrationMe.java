package com.cephadex.ambi.auth.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.cephadex.ambi.auth.enums.IdentityState;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * OAuth-authenticated caller with no {@link com.cephadex.ambi.user.User}
 * document yet — identity lives only in the session. Carries the provider email
 * (for registration-form prefill) and nothing else; there is no profile or
 * entitlement until the user completes registration.
 *
 * @param state             always {@link IdentityState#PRE_REGISTRATION}.
 * @param authenticated     always {@code true}.
 * @param needsRegistration always {@code true}.
 * @param email             the verified provider email.
 */
public record PreRegistrationMe(
        @Schema(requiredMode = REQUIRED) IdentityState state,
        @Schema(requiredMode = REQUIRED) boolean authenticated,
        @Schema(requiredMode = REQUIRED) boolean needsRegistration,
        @Schema(requiredMode = REQUIRED) String email)
        implements MeResponse {

    public PreRegistrationMe(String email) {
        this(IdentityState.PRE_REGISTRATION, true, true, email);
    }
}
