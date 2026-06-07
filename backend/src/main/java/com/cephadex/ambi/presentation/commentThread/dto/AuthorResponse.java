package com.cephadex.ambi.presentation.commentThread.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.cephadex.ambi.presentation.commentThread.Author;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The wire view of a comment's {@link Author}: a snapshot of who wrote it, taken
 * at comment time. {@code userId} is the author's <em>public</em> id, so the
 * client can match it against the signed-in user's {@code publicId} to decide
 * authorship (edit / delete affordances).
 */
public record AuthorResponse(
        @Schema(requiredMode = REQUIRED) String userId,
        @Schema(requiredMode = REQUIRED) String name,
        String pictureUrl) {

    /** Projects a stored {@link Author} onto its response. */
    public static AuthorResponse from(Author author) {
        if (author == null) {
            return null;
        }
        // TODO(avatar): resolve Author.avatar -> a pictureUrl once the app has
        // avatar URL resolution (none exists yet). Null until then; the UI guards
        // on its absence and simply renders no avatar.
        return new AuthorResponse(author.userId(), author.displayName(), null);
    }
}
