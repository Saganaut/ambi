package com.cephadex.ambi.auth.service;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * The internal Redis value stored under {@code ambi:refresh:{token}}. The
 * opaque refresh token (an unsigned UUID-shaped string) is the cookie carried
 * by the browser; this record is what the server looks up to decide whether
 * the token is still valid.
 *
 * <p>{@code burned=true} means the token was already consumed by a previous
 * {@code /refresh} call. The record is kept past consumption for a short grace
 * window (see {@link RedisTokenSessionService}) so a replay of the burned
 * token is recognised as such — auth/README.md Inv 6 reuse detection. A
 * replay triggers revocation of the entire token family by deleting the
 * backing {@link UserSession}.
 *
 * <p>Strictly internal (JSON serialised by the same Jackson 2 mapper as
 * {@link UserSession}) — never a wire DTO.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RefreshTokenRecord {

    /** Session this refresh token belongs to ({@code ambi:userSession:{sessionId}}). */
    private String sessionId;

    /**
     * Family lineage id — all refresh tokens rotated within the same session
     * share this. Mirrors {@link UserSession#getRefreshFamilyId()}; on reuse
     * detection the whole family is revoked (Inv 6).
     */
    private String familyId;

    /**
     * Whether the underlying session was minted as "stay logged in" — drives
     * the persistent vs. idle TTL choice on every {@code /refresh}.
     */
    private boolean persistent;

    /**
     * {@code true} once this token has been consumed by a {@code /refresh}
     * call. A subsequent attempt with the same token is the reuse signal.
     */
    private boolean burned;
}
