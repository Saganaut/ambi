package com.cephadex.ambi.presentation.review;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.UnaryOperator;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.UnauthorizedException;
import com.cephadex.ambi.presentation.commentThread.Author;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.DeckService;
import com.cephadex.ambi.presentation.review.DeckReviewRepositoryCustom.RatingAggregate;
import com.cephadex.ambi.presentation.review.dto.DeckReviewResponse;
import com.cephadex.ambi.presentation.review.dto.DeckReviewSummaryResponse;
import com.cephadex.ambi.presentation.review.dto.RateDeckRequest;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.UserService;

/**
 * The deck-review surface: one {@link DeckReview} per {@code (deck, user)} pair —
 * a star score and an optional written note. Rating a deck again overwrites the
 * caller's existing review (an upsert), so a deck never holds two reviews from the
 * same person.
 *
 * <p>Access is gated on the owning deck: reads go through
 * {@link DeckService#getViewable}, which throws the 403/404 contract. Rating and
 * un-rating additionally require an authenticated principal, and a deck's own
 * owner/editor is barred from reviewing it (you cannot rate your own work). The
 * author of each review is stored as a snapshot at write time and overlaid with the
 * user's current profile on read — the same pattern the comment-thread feature uses,
 * whose {@link Author} record is reused here.
 *
 * <p>After every write the deck's denormalized rating headline
 * ({@code DeckStats.ratingAverage / ratingCount}) is recomputed from the reviews and
 * pushed onto the deck via {@link DeckService#setRatingStats}, so deck cards and list
 * views stay current; the per-star distribution is served live from the summary read.
 */
@Service
public class DeckReviewService {

    private final DeckReviewRepository repository;
    private final DeckService deckService;
    private final UserService userService;

    public DeckReviewService(DeckReviewRepository repository, DeckService deckService,
            UserService userService) {
        this.repository = repository;
        this.deckService = deckService;
        this.userService = userService;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    /** A deck's reviews, newest-first, authors overlaid with current profiles (VIEW). */
    public Page<DeckReviewResponse> listReviews(String deckId, Pageable pageable,
            AmbiPrincipal principal) {
        deckService.getViewable(deckId, principal); // VIEW + deck exists
        String callerPublicId = principal == null ? null : principal.publicId();
        Page<DeckReview> reviews = repository.findByDeckIdOrderByCreatedAtDesc(deckId, pageable);
        UnaryOperator<Author> resolveAuthor = freshAuthors(reviews.getContent());
        return reviews.map(review -> DeckReviewResponse.from(review, resolveAuthor, callerPublicId));
    }

    /** The deck's rating headline: average, count and the 1★..5★ distribution (VIEW). */
    public DeckReviewSummaryResponse getSummary(String deckId, AmbiPrincipal principal) {
        deckService.getViewable(deckId, principal);
        return DeckReviewSummaryResponse.from(repository.aggregate(deckId));
    }

    /**
     * The caller's own review of a deck, or {@code null} when they haven't reviewed
     * it (VIEW + sign-in). "No review yet" is an ordinary state for this optional
     * probe, not an error, so it resolves to {@code null} (a 200 with an empty body)
     * rather than a 404.
     */
    public DeckReviewResponse getMyReview(String deckId, AmbiPrincipal principal) {
        deckService.getViewable(deckId, principal);
        String publicId = requirePublicId(principal);
        return repository.findByDeckIdAndUserId(deckId, publicId)
                .map(review -> toResponse(review, publicId))
                .orElse(null);
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * Submit or overwrite the caller's review of a deck (VIEW + sign-in). A deck's
     * own owner/editor is barred — you cannot review your own work. Keyed on
     * {@code (deckId, userId)}: an existing review is updated in place (and its author
     * snapshot refreshed), otherwise a new one is inserted.
     */
    public DeckReviewResponse rateDeck(String deckId, RateDeckRequest request,
            AmbiPrincipal principal) {
        Deck deck = deckService.getViewable(deckId, principal);
        User user = userService.requireUser(requireUserId(principal));
        if (deckService.permissionsFor(deck, principal).canEdit()) {
            throw new ForbiddenException("REVIEW_SELF_FORBIDDEN",
                    "You cannot review a deck you can edit.");
        }

        String publicId = user.getPublicId();
        Author author = new Author(publicId, user.getDisplayName(), user.getAvatar());
        DeckReview review = repository.findByDeckIdAndUserId(deckId, publicId)
                .orElseGet(() -> {
                    DeckReview fresh = new DeckReview();
                    fresh.setId(UUID.randomUUID().toString());
                    fresh.setDeckId(deckId);
                    fresh.setUserId(publicId);
                    return fresh;
                });
        review.setAuthor(author);
        review.setStars(request.stars());
        review.setBody(normalizeBody(request.body()));

        DeckReview saved = repository.save(review);
        recomputeStats(deckId);
        return toResponse(saved, publicId);
    }

    /** Remove the caller's review of a deck (VIEW + sign-in). A no-op if none exists. */
    public void deleteMyReview(String deckId, AmbiPrincipal principal) {
        deckService.getViewable(deckId, principal);
        String publicId = requirePublicId(principal);
        repository.findByDeckIdAndUserId(deckId, publicId).ifPresent(review -> {
            repository.delete(review);
            recomputeStats(deckId);
        });
    }

    // ── Internals ───────────────────────────────────────────────────────────────

    /** Recompute the deck's denormalized rating headline from its reviews. */
    private void recomputeStats(String deckId) {
        RatingAggregate aggregate = repository.aggregate(deckId);
        deckService.setRatingStats(deckId, aggregate.average(), aggregate.count());
    }

    private static String normalizeBody(String body) {
        if (body == null) {
            return null;
        }
        String trimmed = body.strip();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** Single-review response with the same author overlay as the list read. */
    private DeckReviewResponse toResponse(DeckReview review, String callerPublicId) {
        return DeckReviewResponse.from(review, freshAuthors(List.of(review)), callerPublicId);
    }

    /**
     * Builds the author overlay for a batch of reviews: one lookup of every distinct
     * author's current {@link User}, mapped back onto the stored snapshots so responses
     * always carry the author's <em>current</em> display name and avatar. An author
     * whose user is gone keeps its snapshot. Mirrors {@code CommentThreadService}.
     */
    private UnaryOperator<Author> freshAuthors(Collection<DeckReview> reviews) {
        Set<String> authorIds = reviews.stream()
                .map(DeckReview::getAuthor)
                .filter(author -> author != null && author.userId() != null)
                .map(Author::userId)
                .collect(Collectors.toSet());
        Map<String, User> users = userService.findByPublicIds(authorIds);
        return author -> {
            User user = users.get(author.userId());
            if (user == null) {
                return author;
            }
            return new Author(author.userId(), user.getDisplayName(), user.getAvatar());
        };
    }

    /** The caller's Mongo user id, guarded — review writes require sign-in. */
    private static String requireUserId(AmbiPrincipal principal) {
        if (principal == null || principal.userId() == null) {
            throw new UnauthorizedException("NOT_AUTHENTICATED", "Sign-in is required.");
        }
        return principal.userId();
    }

    /** The caller's public id, guarded — keys the caller's review row. */
    private static String requirePublicId(AmbiPrincipal principal) {
        if (principal == null || principal.publicId() == null) {
            throw new UnauthorizedException("NOT_AUTHENTICATED", "Sign-in is required.");
        }
        return principal.publicId();
    }
}
