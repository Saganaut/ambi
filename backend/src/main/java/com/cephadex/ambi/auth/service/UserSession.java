package com.cephadex.ambi.auth.service;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.user.enums.UserLevel;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * The authoritative session state stored in Redis under
 * {@code ambi:userSession:{sessionId}} (auth/README.md). Every authenticated
 * request is validated against this record, not the JWT signature alone — a
 * token whose record is absent/expired/revoked is rejected even if its
 * signature is valid. This is an internal Redis value (JSON), not a wire DTO.
 *
 * <p>
 * Distinct from {@code LiveSession} (an interactive game session); this is
 * the per-browser authenticated session that backs
 * {@code AMBI_AT}/{@code AMBI_RT}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserSession {

    /** The session handle; also the {@code sid} claim in the access JWT. */
    private String sessionId;

    private IdentityState state;

    /** Mongo {@code _id}; null for PRE_REGISTRATION (no User yet). */
    private String userId;

    private AuthProvider provider;
    private String externalProviderId;
    private String email;

    /**
     * Snapshot of the user's level at mint time. HINT ONLY — never trusted for
     * authorization or entitlement; the filter re-loads the live User so a ban /
     * level change / lapsed entitlement takes effect on the next request (Inv 7).
     */
    private UserLevel userLevel;

    /**
     * Whether this session is backed by a persistent ("stay logged in") refresh
     * token.
     */
    private boolean persistent;

    /**
     * Refresh-token family id for Phase-2 rotation + reuse detection (Inv 6).
     * Stored now so the lineage exists; no rotation logic in Phase 1.
     */
    private String refreshFamilyId;

    /**
     * Creation timestamp as epoch milliseconds. Stored as a plain {@code long}
     * (not {@link java.time.Instant}) so the Jackson 2 ObjectMapper used by this
     * package serialises it without needing the JSR-310 module on the classpath.
     */
    private long createdAtEpochMs;
}
