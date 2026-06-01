package com.cephadex.ambi.user.dto;

import com.cephadex.ambi.user.Avatar;

import jakarta.validation.constraints.Size;

/**
 * The user-settable half of an {@link Avatar}. The client may pick exactly one
 * source — an {@code externalSrc} URL (used directly until cached) or an
 * {@code internalAvatarId} (a pick from the built-in avatar collection). The
 * S3 {@code srcKey} is server-owned (populated by the avatar-ingest pipeline)
 * and is therefore never accepted from request input.
 *
 * @param externalSrc      external avatar URL; takes precedence when present.
 * @param internalAvatarId id of a built-in avatar; used when no external URL.
 */
public record AvatarSelection(
        @Size(max = 2048) String externalSrc,
        @Size(max = 64) String internalAvatarId) {

    /**
     * Maps this selection onto a fresh {@link Avatar}. A non-blank
     * {@code externalSrc} wins and marks the avatar external; otherwise the
     * internal id is used. {@code srcKey} is intentionally left null — it is
     * the server's to fill.
     */
    public Avatar toAvatar() {
        boolean useExternal = externalSrc != null && !externalSrc.isBlank();
        Avatar avatar = new Avatar();
        avatar.setExternal(useExternal);
        avatar.setExternalSrc(useExternal ? externalSrc : null);
        avatar.setInternalAvatarId(useExternal ? null : internalAvatarId);
        return avatar;
    }
}
