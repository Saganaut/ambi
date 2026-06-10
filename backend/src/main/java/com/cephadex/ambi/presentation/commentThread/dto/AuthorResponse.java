package com.cephadex.ambi.presentation.commentThread.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.cephadex.ambi.presentation.commentThread.Author;
import com.cephadex.ambi.user.Avatar;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The wire view of a comment's {@link Author}. {@code userId} is the author's
 * <em>public</em> id, so the client can match it against the signed-in user's
 * {@code publicId} to decide authorship (edit / delete affordances).
 *
 * <p>The stored {@code Author} is a snapshot taken at comment time, but the
 * service overlays it with the user's <em>current</em> display name and avatar
 * on every read (falling back to the snapshot for users that no longer exist),
 * so what's serialized here is fresh. An avatar's embedded {@code AppImage} is
 * presign-hydrated by the {@code AppImage} serializer like everywhere else.
 */
public record AuthorResponse(
        @Schema(requiredMode = REQUIRED) String userId,
        @Schema(requiredMode = REQUIRED) String name,
        Avatar avatar) {

    /** Projects a stored (or overlaid) {@link Author} onto its response. */
    public static AuthorResponse from(Author author) {
        if (author == null) {
            return null;
        }
        return new AuthorResponse(author.userId(), author.displayName(), author.avatar());
    }
}
