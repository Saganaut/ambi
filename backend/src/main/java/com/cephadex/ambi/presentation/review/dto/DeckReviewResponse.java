package com.cephadex.ambi.presentation.review.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.function.UnaryOperator;

import com.cephadex.ambi.presentation.commentThread.Author;
import com.cephadex.ambi.presentation.commentThread.dto.AuthorResponse;
import com.cephadex.ambi.presentation.review.DeckReview;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The wire view of a single {@link DeckReview}: who wrote it, the star score and
 * the optional written body. {@code author} reuses the comment-thread
 * {@link AuthorResponse} — its {@code userId} is the author's <em>public</em> id,
 * overlaid with the user's current profile on read. {@code mine} tells the client
 * whether this review belongs to the caller, so it can badge it and keep it out of
 * the duplicate "your rating" editor.
 */
public record DeckReviewResponse(
        @Schema(requiredMode = REQUIRED) String id,
        @Schema(requiredMode = REQUIRED) AuthorResponse author,
        @Schema(requiredMode = REQUIRED) int stars,
        String body,
        @Schema(requiredMode = REQUIRED) boolean mine) {

    /**
     * Projects a stored {@link DeckReview} onto its response. {@code resolveAuthor}
     * maps the stored author snapshot to what should be serialized — the service
     * passes an overlay that swaps in the user's current display name and avatar.
     * {@code callerPublicId} is the signed-in user's public id (or {@code null} for
     * an anonymous read), used to compute {@code mine}.
     */
    public static DeckReviewResponse from(DeckReview review, UnaryOperator<Author> resolveAuthor,
            String callerPublicId) {
        Author author = review.getAuthor();
        boolean mine = callerPublicId != null && callerPublicId.equals(review.getUserId());
        return new DeckReviewResponse(
                review.getId(),
                AuthorResponse.from(author != null ? resolveAuthor.apply(author) : null),
                review.getStars(),
                review.getBody(),
                mine);
    }
}
