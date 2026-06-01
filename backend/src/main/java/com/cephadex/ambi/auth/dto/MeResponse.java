package com.cephadex.ambi.auth.dto;

import com.cephadex.ambi.auth.enums.IdentityState;
import io.swagger.v3.oas.annotations.media.DiscriminatorMapping;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The {@code GET /api/auth/me} payload, modelled as a discriminated union over
 * the four identity states rather than one flat all-nullable object. Each state
 * is its own record carrying exactly the fields that exist for it, so the
 * generated OpenAPI — and the TypeScript client derived from it — can guarantee,
 * for example, that a {@link RegisteredMe} always has an {@code email} and
 * {@code publicId}, while a {@link VisitorMe} has neither. {@code state} is the
 * discriminator the frontend narrows on.
 *
 * <p>{@code authenticated} and {@code needsRegistration} are kept on every
 * variant for convenience even though {@code state} already implies them.
 *
 * <p>Polymorphic JSON needs no {@code @JsonTypeInfo}: the endpoints return the
 * concrete record, which Jackson serialises by its own components (each variant
 * already includes {@code state}). The {@code @Schema} below is only to make
 * SpringDoc emit {@code oneOf} + a {@code discriminator.mapping}, which the
 * codegen turns into a narrowing TS union.
 */
@Schema(
        description = "Current session payload, discriminated by `state`.",
        discriminatorProperty = "state",
        oneOf = {VisitorMe.class, GuestMe.class, PreRegistrationMe.class, RegisteredMe.class},
        discriminatorMapping = {
                @DiscriminatorMapping(value = "VISITOR", schema = VisitorMe.class),
                @DiscriminatorMapping(value = "GUEST", schema = GuestMe.class),
                @DiscriminatorMapping(value = "PRE_REGISTRATION", schema = PreRegistrationMe.class),
                @DiscriminatorMapping(value = "REGISTERED", schema = RegisteredMe.class)
        })
public sealed interface MeResponse
        permits VisitorMe, GuestMe, PreRegistrationMe, RegisteredMe {

    /** @return the identity-state discriminator. */
    IdentityState state();

    /** @return false only for {@link VisitorMe}; true for every real session. */
    boolean authenticated();

    /** @return true only for {@link PreRegistrationMe} (OAuth'd, no account yet). */
    boolean needsRegistration();

    /** The visitor (no session) payload. */
    static MeResponse visitor() {
        return new VisitorMe();
    }
}
