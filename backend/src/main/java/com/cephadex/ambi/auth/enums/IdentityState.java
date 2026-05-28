package com.cephadex.ambi.auth.enums;

/**
 * The four identity states every request resolves to (auth/README.md). This is
 * the per-request <em>session</em> axis and is deliberately distinct from
 * {@link com.cephadex.ambi.user.enums.UserLevel}, which is the account-class
 * <em>authorization</em> axis ("do not conflate them"). UserLevel cannot
 * distinguish {@code VISITOR} from {@code PRE_REGISTRATION} — both have no
 * {@code User} — yet they are gated very differently (Inv 8).
 *
 * <ul>
 *   <li>{@code VISITOR} — no session.</li>
 *   <li>{@code GUEST} — persisted, ephemeral {@code User}, {@code INTERNAL} auth.</li>
 *   <li>{@code PRE_REGISTRATION} — authenticated with a provider but no {@code User}
 *       document yet; identity held in the session only.</li>
 *   <li>{@code REGISTERED} — persisted {@code User}, provider auth, verified email.</li>
 * </ul>
 */
public enum IdentityState {
    VISITOR,
    GUEST,
    PRE_REGISTRATION,
    REGISTERED
}
