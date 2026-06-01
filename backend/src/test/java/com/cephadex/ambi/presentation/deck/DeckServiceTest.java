package com.cephadex.ambi.presentation.deck;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.presentation.deck.enums.OwnershipType;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.SlideRankService;
import com.cephadex.ambi.user.UserService;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * The service-level slide-ordering behaviour: append keys a new slide past the
 * current last, move rewrites order through the aggregate and persists, and both
 * still honour the deck's EDIT gate and the {@code SLIDE_NOT_FOUND} contract.
 * Permission predicates themselves live on the aggregate; here the repository is
 * mocked and a real {@link SlideRankService} does the key math.
 */
class DeckServiceTest {

    private DeckRepository deckRepository;
    private UserService userService;
    private DeckService deckService;
    private AmbiPrincipal owner;

    @BeforeEach
    void setUp() {
        deckRepository = mock(DeckRepository.class);
        userService = mock(UserService.class);
        deckService = new DeckService(deckRepository, userService, new SlideRankService());
        owner = principal("owner-1");
        // Echo back whatever the service saves — tests inspect the in-flight deck.
        when(deckRepository.save(any(Deck.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void addSlideAppendsAfterMax() {
        Deck deck = keyedDeck("owner-1", "s1", "s2");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));
        String previousMax = deck.maxSortOrder();

        Slide added = deckService.addSlide("deck-1", slide("s3"), owner);

        assertThat(added.getSortOrder()).isNotNull().isGreaterThan(previousMax);
        // It's last in the persisted order.
        assertThat(orderedIds(deck)).containsExactly("s1", "s2", "s3");
        verify(deckRepository).save(deck);
    }

    @Test
    void addSlideToEmptyDeckGetsInitialKey() {
        Deck deck = deck("owner-1");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        Slide added = deckService.addSlide("deck-1", slide("s1"), owner);

        assertThat(added.getSortOrder()).isEqualTo(new SlideRankService().initial());
    }

    @Test
    void moveSlidePersistsAndReturnsDeck() {
        Deck deck = keyedDeck("owner-1", "s1", "s2", "s3");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        Deck result = deckService.moveSlide("deck-1", "s3", 0, owner);

        assertThat(orderedIds(result)).containsExactly("s3", "s1", "s2");
        verify(deckRepository).save(deck);
    }

    @Test
    void moveSlideRejectsUnknownSlideWithNotFound() {
        Deck deck = keyedDeck("owner-1", "s1");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        assertThatThrownBy(() -> deckService.moveSlide("deck-1", "missing", 0, owner))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Slide not found");
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void moveSlideRequiresEdit() {
        Deck deck = keyedDeck("someone-else", "s1", "s2");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        assertThatThrownBy(() -> deckService.moveSlide("deck-1", "s1", 0, principal("intruder")))
                .isInstanceOf(ForbiddenException.class);
        verify(deckRepository, never()).save(any(Deck.class));
    }

    // ── Fixtures ────────────────────────────────────────────────────────────────

    private static AmbiPrincipal principal(String userId) {
        return new AmbiPrincipal(IdentityState.REGISTERED, userId, "pub-" + userId,
                UserLevel.USER, AuthProvider.INTERNAL, null, null, "sid-" + userId);
    }

    private static Deck deck(String ownerId) {
        Deck deck = new Deck();
        deck.setId("deck-1");
        deck.setOwnership(new DeckOwnership(OwnershipType.USER, ownerId));
        deck.setSlides(new ArrayList<>());
        return deck;
    }

    private Deck keyedDeck(String ownerId, String... slideIds) {
        Deck deck = deck(ownerId);
        for (String id : slideIds) {
            deck.getSlides().add(slide(id));
        }
        deck.backfillRanks(new SlideRankService());
        deck.resort();
        return deck;
    }

    private static Slide slide(String id) {
        Slide slide = new Slide();
        slide.setId(id);
        return slide;
    }

    private static List<String> orderedIds(Deck deck) {
        return deck.getSlides().stream()
                .sorted(SlideRankService.ordering())
                .map(Slide::getId)
                .toList();
    }
}
