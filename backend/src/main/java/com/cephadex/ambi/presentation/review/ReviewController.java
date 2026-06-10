package com.cephadex.ambi.presentation.review;

import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.presentation.review.dto.DeckReviewResponse;
import com.cephadex.ambi.presentation.review.dto.DeckReviewSummaryResponse;
import com.cephadex.ambi.presentation.review.dto.RateDeckRequest;

import jakarta.validation.Valid;

/**
 * HTTP surface for a deck's reviews — ratings as a sub-resource of a deck. Every
 * route delegates to {@link DeckReviewService}, which owns the permission rules
 * (VIEW the deck to read; authenticated to rate / un-rate; a deck's own
 * owner/editor is barred from reviewing it) and throws the typed
 * {@code ApiException}s the global handler turns into RFC 9457 problem responses.
 *
 * <p>The class name is deliberately {@code ReviewController} (not
 * {@code DeckReviewController}): the frontend codegen derives the API file name
 * from the first segment of the OpenAPI tag, so {@code review-controller} routes
 * these endpoints into {@code reviewApi.gen.ts} — parallel to how
 * {@code CommentThreadController} feeds {@code commentApi.gen.ts}.
 */
@RestController
@RequestMapping("/api/decks/{deckId}/reviews")
public class ReviewController {

    private final DeckReviewService deckReviewService;

    public ReviewController(DeckReviewService deckReviewService) {
        this.deckReviewService = deckReviewService;
    }

    /** A deck's reviews, newest first (VIEW). */
    @GetMapping
    public PagedModel<DeckReviewResponse> listDeckReviews(
            @PathVariable String deckId,
            Pageable pageable,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return new PagedModel<>(deckReviewService.listReviews(deckId, pageable, principal));
    }

    /** The deck's rating headline: average, count and 1★..5★ distribution (VIEW). */
    @GetMapping("/summary")
    public DeckReviewSummaryResponse getDeckReviewSummary(
            @PathVariable String deckId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return deckReviewService.getSummary(deckId, principal);
    }

    /** The caller's own review of the deck, or an empty body if they haven't reviewed it (VIEW + sign-in). */
    @GetMapping("/mine")
    public DeckReviewResponse getMyReview(
            @PathVariable String deckId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return deckReviewService.getMyReview(deckId, principal);
    }

    /** Submit or overwrite the caller's review (VIEW + sign-in; not the deck's editor). */
    @PutMapping
    public DeckReviewResponse rateDeck(
            @PathVariable String deckId,
            @Valid @RequestBody RateDeckRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return deckReviewService.rateDeck(deckId, body, principal);
    }

    /** Remove the caller's review of the deck (VIEW + sign-in). */
    @DeleteMapping("/mine")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMyReview(
            @PathVariable String deckId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        deckReviewService.deleteMyReview(deckId, principal);
    }
}
