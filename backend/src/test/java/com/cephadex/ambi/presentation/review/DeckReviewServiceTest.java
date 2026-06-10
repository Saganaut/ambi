package com.cephadex.ambi.presentation.review;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.ArgumentCaptor;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.ViewerPermissions;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.UnauthorizedException;
import com.cephadex.ambi.presentation.commentThread.Author;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.DeckService;
import com.cephadex.ambi.presentation.review.DeckReviewRepositoryCustom.RatingAggregate;
import com.cephadex.ambi.presentation.review.dto.DeckReviewResponse;
import com.cephadex.ambi.presentation.review.dto.DeckReviewSummaryResponse;
import com.cephadex.ambi.presentation.review.dto.RateDeckRequest;
import com.cephadex.ambi.user.Avatar;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.UserService;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Service-level behaviour for deck reviews: the one-per-user upsert, the self-review
 * bar, the authentication gates, deletion, the author overlay on reads, and the
 * denormalized rating-stats recompute after every write. The deck VIEW gate and the
 * editor check live in {@link DeckService} (mocked here), so these assert the review
 * rules layered on top of it.
 */
class DeckReviewServiceTest {

    private DeckReviewRepository repository;
    private DeckService deckService;
    private UserService userService;
    private DeckReviewService service;
    private AmbiPrincipal rater;
    private Deck deck;

    @BeforeEach
    void setUp() {
        repository = mock(DeckReviewRepository.class);
        deckService = mock(DeckService.class);
        userService = mock(UserService.class);
        service = new DeckReviewService(repository, deckService, userService);
        rater = principal("rater-1");
        deck = new Deck();
        deck.setId("deck-1");
        when(deckService.getViewable(eq("deck-1"), any())).thenReturn(deck);
        when(repository.save(any(DeckReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(repository.aggregate("deck-1"))
                .thenReturn(new RatingAggregate(1, 4.0, new long[] {0, 0, 0, 1, 0}));
    }

    // ── Rating (upsert) ─────────────────────────────────────────────────────────

    @Test
    void rateDeckInsertsNewReviewWhenNoneExists() {
        nonEditor();
        User raterUser = user("pub-rater-1", "Ann");
        when(userService.requireUser("rater-1")).thenReturn(raterUser);
        when(repository.findByDeckIdAndUserId("deck-1", "pub-rater-1")).thenReturn(Optional.empty());

        DeckReviewResponse response = service.rateDeck("deck-1",
                new RateDeckRequest(4, "Solid deck"), rater);

        assertThat(response.stars()).isEqualTo(4);
        assertThat(response.body()).isEqualTo("Solid deck");
        assertThat(response.author().userId()).isEqualTo("pub-rater-1");
        assertThat(response.mine()).isTrue();

        ArgumentCaptor<DeckReview> saved = ArgumentCaptor.forClass(DeckReview.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().getDeckId()).isEqualTo("deck-1");
        assertThat(saved.getValue().getUserId()).isEqualTo("pub-rater-1");
        assertThat(saved.getValue().getStars()).isEqualTo(4);
    }

    @Test
    void rateDeckOverwritesExistingReviewKeepingItsId() {
        nonEditor();
        User raterUser = user("pub-rater-1", "Ann");
        when(userService.requireUser("rater-1")).thenReturn(raterUser);
        DeckReview existing = review("existing-id", "pub-rater-1", 5, "old");
        when(repository.findByDeckIdAndUserId("deck-1", "pub-rater-1")).thenReturn(Optional.of(existing));

        DeckReviewResponse response = service.rateDeck("deck-1",
                new RateDeckRequest(2, "changed my mind"), rater);

        assertThat(response.id()).isEqualTo("existing-id"); // same row, not a new one
        assertThat(response.stars()).isEqualTo(2);
        ArgumentCaptor<DeckReview> saved = ArgumentCaptor.forClass(DeckReview.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().getId()).isEqualTo("existing-id");
        assertThat(saved.getValue().getStars()).isEqualTo(2);
    }

    @Test
    void rateDeckBlocksTheDecksOwnEditor() {
        User raterUser = user("pub-rater-1", "Ann");
        when(userService.requireUser("rater-1")).thenReturn(raterUser);
        when(deckService.permissionsFor(eq(deck), any()))
                .thenReturn(new ViewerPermissions(true, true, true)); // can edit → self-review

        assertThatThrownBy(() -> service.rateDeck("deck-1", new RateDeckRequest(5, "nice"), rater))
                .isInstanceOf(ForbiddenException.class);
        verify(repository, never()).save(any());
        verify(deckService, never()).setRatingStats(any(), any(), org.mockito.ArgumentMatchers.anyLong());
    }

    @Test
    void rateDeckRequiresAuthentication() {
        AmbiPrincipal visitor = new AmbiPrincipal(IdentityState.VISITOR, null, null, null,
                null, null, null, "sid-anon");

        assertThatThrownBy(() -> service.rateDeck("deck-1", new RateDeckRequest(4, "x"), visitor))
                .isInstanceOf(UnauthorizedException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void rateDeckRecomputesRatingStats() {
        nonEditor();
        User raterUser = user("pub-rater-1", "Ann");
        when(userService.requireUser("rater-1")).thenReturn(raterUser);
        when(repository.findByDeckIdAndUserId("deck-1", "pub-rater-1")).thenReturn(Optional.empty());

        service.rateDeck("deck-1", new RateDeckRequest(4, null), rater);

        verify(repository).aggregate("deck-1");
        verify(deckService).setRatingStats("deck-1", 4.0, 1L);
    }

    @Test
    void rateDeckBlankBodyIsStoredAsNull() {
        nonEditor();
        User raterUser = user("pub-rater-1", "Ann");
        when(userService.requireUser("rater-1")).thenReturn(raterUser);
        when(repository.findByDeckIdAndUserId("deck-1", "pub-rater-1")).thenReturn(Optional.empty());

        DeckReviewResponse response = service.rateDeck("deck-1",
                new RateDeckRequest(3, "   "), rater);

        assertThat(response.body()).isNull();
    }

    // ── Deleting ──────────────────────────────────────────────────────────────────

    @Test
    void deleteMyReviewRemovesRowAndRecomputesStats() {
        DeckReview existing = review("r1", "pub-rater-1", 4, "ok");
        when(repository.findByDeckIdAndUserId("deck-1", "pub-rater-1")).thenReturn(Optional.of(existing));

        service.deleteMyReview("deck-1", rater);

        verify(repository).delete(existing);
        verify(deckService).setRatingStats("deck-1", 4.0, 1L);
    }

    @Test
    void deleteMyReviewIsNoOpWhenNoneExists() {
        when(repository.findByDeckIdAndUserId("deck-1", "pub-rater-1")).thenReturn(Optional.empty());

        service.deleteMyReview("deck-1", rater);

        verify(repository, never()).delete(any());
        verify(deckService, never()).setRatingStats(any(), any(), org.mockito.ArgumentMatchers.anyLong());
    }

    // ── My review ─────────────────────────────────────────────────────────────────

    @Test
    void getMyReviewReturnsCallersReview() {
        when(repository.findByDeckIdAndUserId("deck-1", "pub-rater-1"))
                .thenReturn(Optional.of(review("r1", "pub-rater-1", 4, "ok")));

        DeckReviewResponse response = service.getMyReview("deck-1", rater);

        assertThat(response.id()).isEqualTo("r1");
        assertThat(response.mine()).isTrue();
    }

    @Test
    void getMyReviewIsNullWhenAbsent() {
        when(repository.findByDeckIdAndUserId("deck-1", "pub-rater-1")).thenReturn(Optional.empty());

        assertThat(service.getMyReview("deck-1", rater)).isNull();
    }

    // ── Summary & listing ─────────────────────────────────────────────────────────

    @Test
    void getSummaryMapsTheAggregate() {
        when(repository.aggregate("deck-1"))
                .thenReturn(new RatingAggregate(3, 4.0, new long[] {0, 0, 1, 1, 1}));

        DeckReviewSummaryResponse summary = service.getSummary("deck-1", rater);

        assertThat(summary.count()).isEqualTo(3);
        assertThat(summary.average()).isEqualTo(4.0);
        assertThat(summary.distribution()).containsExactly(0, 0, 1, 1, 1);
    }

    @Test
    void listReviewsOverlaysAuthorsWithCurrentProfile() {
        DeckReview stored = review("r1", "pub-rater-1", 4, "ok"); // snapshot name "Name"
        when(repository.findByDeckIdOrderByCreatedAtDesc("deck-1", PageRequest.of(0, 10)))
                .thenReturn(new PageImpl<>(List.of(stored)));

        Avatar current = new Avatar();
        current.setInternalAvatarId("avatar-07");
        User renamed = user("pub-rater-1", "Ann the Brave");
        when(renamed.getAvatar()).thenReturn(current);
        when(userService.findByPublicIds(Set.of("pub-rater-1")))
                .thenReturn(Map.of("pub-rater-1", renamed));

        var page = service.listReviews("deck-1", PageRequest.of(0, 10), rater);

        var author = page.getContent().get(0).author();
        assertThat(author.name()).isEqualTo("Ann the Brave");
        assertThat(author.avatar()).isSameAs(current);
        assertThat(page.getContent().get(0).mine()).isTrue(); // pub-rater-1 == caller
    }

    @Test
    void listReviewsKeepsSnapshotForVanishedAuthors() {
        DeckReview stored = review("r1", "pub-gone", 3, "ok");
        when(repository.findByDeckIdOrderByCreatedAtDesc("deck-1", PageRequest.of(0, 10)))
                .thenReturn(new PageImpl<>(List.of(stored)));
        when(userService.findByPublicIds(Set.of("pub-gone"))).thenReturn(Map.of());

        var page = service.listReviews("deck-1", PageRequest.of(0, 10), rater);

        var author = page.getContent().get(0).author();
        assertThat(author.name()).isEqualTo("Name");
        assertThat(author.avatar()).isNull();
        assertThat(page.getContent().get(0).mine()).isFalse();
    }

    // ── Fixtures ────────────────────────────────────────────────────────────────

    /** Stub the deck so the caller is not its editor (self-review allowed through). */
    private void nonEditor() {
        when(deckService.permissionsFor(eq(deck), any()))
                .thenReturn(new ViewerPermissions(true, false, false));
    }

    private static DeckReview review(String id, String userPublicId, int stars, String body) {
        DeckReview review = new DeckReview();
        review.setId(id);
        review.setDeckId("deck-1");
        review.setUserId(userPublicId);
        review.setAuthor(new Author(userPublicId, "Name", null));
        review.setStars(stars);
        review.setBody(body);
        return review;
    }

    private static User user(String publicId, String displayName) {
        User user = mock(User.class);
        when(user.getPublicId()).thenReturn(publicId);
        when(user.getDisplayName()).thenReturn(displayName);
        when(user.getAvatar()).thenReturn(null);
        return user;
    }

    private static AmbiPrincipal principal(String userId) {
        return new AmbiPrincipal(IdentityState.REGISTERED, userId, "pub-" + userId,
                UserLevel.USER, AuthProvider.INTERNAL, null, null, "sid-" + userId);
    }
}
