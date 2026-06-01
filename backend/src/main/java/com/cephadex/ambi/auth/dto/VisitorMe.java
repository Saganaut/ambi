package com.cephadex.ambi.auth.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.cephadex.ambi.auth.enums.IdentityState;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Anonymous caller — no session. Carries no profile fields at all.
 *
 * @param state             always {@link IdentityState#VISITOR}.
 * @param authenticated     always {@code false}.
 * @param needsRegistration always {@code false}.
 */
public record VisitorMe(
        @Schema(requiredMode = REQUIRED) IdentityState state,
        @Schema(requiredMode = REQUIRED) boolean authenticated,
        @Schema(requiredMode = REQUIRED) boolean needsRegistration)
        implements MeResponse {

    public VisitorMe() {
        this(IdentityState.VISITOR, false, false);
    }
}
