package com.cephadex.ambi.presentation.deck;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.Ownership;
import com.cephadex.ambi.common.ViewerPermissions;
import com.cephadex.ambi.common.enums.OwnershipType;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.deck.enums.DeckAclRole;
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

    // ── Images ───────────────────────────────────────────────────────────────────

    @Test
    void setDeckCoverImagePersistsAndReturnsDeck() {
        Deck deck = deck("owner-1");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));
        AppImage image = image("https://img/cover.jpg");

        Deck result = deckService.setDeckCoverImage("deck-1", image, owner);

        assertThat(result.getCoverImage()).isSameAs(image);
        verify(deckRepository).save(deck);
    }

    @Test
    void clearDeckCoverImageNullsIt() {
        Deck deck = deck("owner-1");
        deck.setCoverImage(image("https://img/cover.jpg"));
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        Deck result = deckService.clearDeckCoverImage("deck-1", owner);

        assertThat(result.getCoverImage()).isNull();
        verify(deckRepository).save(deck);
    }

    @Test
    void setSlideCoverImageStampsAuditAndSaves() {
        Deck deck = keyedDeck("owner-1", "s1", "s2");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));
        AppImage image = image("https://img/slide.jpg");

        Slide result = deckService.setSlideCoverImage("deck-1", "s1", image, owner);

        assertThat(result.getCoverImage()).isSameAs(image);
        assertThat(result.getLastEditedByUserId()).isEqualTo("owner-1");
        verify(deckRepository).save(deck);
    }

    @Test
    void setSlideImageRejectsUnknownSlideWithNotFound() {
        Deck deck = keyedDeck("owner-1", "s1");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        assertThatThrownBy(() -> deckService.setSlideCoverImage("deck-1", "missing", image("x"), owner))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Slide not found");
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void setDeckImageRequiresEdit() {
        Deck deck = deck("someone-else");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        assertThatThrownBy(() -> deckService.setDeckCoverImage("deck-1", image("x"), principal("intruder")))
                .isInstanceOf(ForbiddenException.class);
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void updatePreservesExistingDeckImages() {
        // Images have a single owner in the image endpoints; a metadata edit must
        // leave them alone rather than null them out.
        Deck deck = deck("owner-1");
        AppImage cover = image("https://img/cover.jpg");
        AppImage background = image("https://img/bg.jpg");
        deck.setCoverImage(cover);
        deck.setBackgroundImage(background);
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        Deck changes = new Deck();
        changes.setName("Renamed"); // no images carried — they're not in the request DTO

        Deck result = deckService.update("deck-1", changes, owner);

        assertThat(result.getName()).isEqualTo("Renamed");
        assertThat(result.getCoverImage()).isSameAs(cover);
        assertThat(result.getBackgroundImage()).isSameAs(background);
    }

    @Test
    void updateSlidePreservesExistingSlideImages() {
        Deck deck = keyedDeck("owner-1", "s1");
        Slide existing = deck.findSlide("s1").orElseThrow();
        AppImage cover = image("https://img/slide-cover.jpg");
        existing.setCoverImage(cover);
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        Slide changes = slide("s1");
        changes.setTitle("Renamed slide"); // no image carried

        Slide result = deckService.updateSlide("deck-1", "s1", changes, owner);

        assertThat(result.getTitle()).isEqualTo("Renamed slide");
        assertThat(result.getCoverImage()).isSameAs(cover);
    }

    // ── Tags ───────────────────────────────────────────────────────────────────

    @Test
    void setTagsPersistsAndReturnsDeck() {
        Deck deck = deck("owner-1");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        Deck result = deckService.setTags("deck-1", Set.of("lotr", "trivia"), owner);

        assertThat(result.getTags()).containsExactlyInAnyOrder("lotr", "trivia");
        verify(deckRepository).save(deck);
    }

    @Test
    void setTagsReplacesExistingTags() {
        Deck deck = deck("owner-1");
        deck.setTags(new LinkedHashSet<>(List.of("old")));
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        Deck result = deckService.setTags("deck-1", Set.of("new"), owner);

        assertThat(result.getTags()).containsExactly("new");
        verify(deckRepository).save(deck);
    }

    @Test
    void setEmptyTagsClearsThem() {
        Deck deck = deck("owner-1");
        deck.setTags(new LinkedHashSet<>(List.of("old")));
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        Deck result = deckService.setTags("deck-1", Set.of(), owner);

        assertThat(result.getTags()).isEmpty();
        verify(deckRepository).save(deck);
    }

    @Test
    void setTagsRequiresEdit() {
        Deck deck = deck("someone-else");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        assertThatThrownBy(() -> deckService.setTags("deck-1", Set.of("x"), principal("intruder")))
                .isInstanceOf(ForbiddenException.class);
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void updatePreservesExistingTags() {
        // Tags have a single owner in the tags endpoint; a metadata edit must
        // leave them alone rather than null them out.
        Deck deck = deck("owner-1");
        deck.setTags(new LinkedHashSet<>(List.of("keep-me")));
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        Deck changes = new Deck();
        changes.setName("Renamed"); // no tags carried — they're not in the request DTO

        Deck result = deckService.update("deck-1", changes, owner);

        assertThat(result.getName()).isEqualTo("Renamed");
        assertThat(result.getTags()).containsExactly("keep-me");
    }

    // ── Slide settings ───────────────────────────────────────────────────────────

    @Test
    void setSlidePointSettingsStampsAuditAndSaves() {
        Deck deck = keyedDeck("owner-1", "s1");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));
        Settings.PointSettings points = pointSettings(100);

        Slide result = deckService.setSlidePointSettings("deck-1", "s1", points, owner);

        assertThat(result.getSettings().pointSettings()).isSameAs(points);
        assertThat(result.getLastEditedByUserId()).isEqualTo("owner-1");
        verify(deckRepository).save(deck);
    }

    @Test
    void setSlidePointSettingsPreservesExistingAnswerSettings() {
        Deck deck = keyedDeck("owner-1", "s1");
        Slide existing = deck.findSlide("s1").orElseThrow();
        Settings.AnswerSettings answers = answerSettings(45);
        existing.setSettings(new Settings.SlideSettings(null, answers));
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        Slide result = deckService.setSlidePointSettings("deck-1", "s1", pointSettings(20), owner);

        assertThat(result.getSettings().pointSettings().points()).isEqualTo(20);
        assertThat(result.getSettings().answerSettings()).isSameAs(answers);
    }

    @Test
    void clearSlidePointSettingsKeepsAnswerSettings() {
        Deck deck = keyedDeck("owner-1", "s1");
        Slide existing = deck.findSlide("s1").orElseThrow();
        Settings.AnswerSettings answers = answerSettings(45);
        existing.setSettings(new Settings.SlideSettings(pointSettings(20), answers));
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        Slide result = deckService.clearSlidePointSettings("deck-1", "s1", owner);

        assertThat(result.getSettings().pointSettings()).isNull();
        assertThat(result.getSettings().answerSettings()).isSameAs(answers);
    }

    @Test
    void clearingBothHalvesDropsTheWrapperToNull() {
        Deck deck = keyedDeck("owner-1", "s1");
        Slide existing = deck.findSlide("s1").orElseThrow();
        existing.setSettings(new Settings.SlideSettings(pointSettings(20), null));
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        Slide result = deckService.clearSlidePointSettings("deck-1", "s1", owner);

        assertThat(result.getSettings()).isNull();
    }

    @Test
    void setSlideAnswerSettingsPreservesExistingPointSettings() {
        Deck deck = keyedDeck("owner-1", "s1");
        Slide existing = deck.findSlide("s1").orElseThrow();
        Settings.PointSettings points = pointSettings(80);
        existing.setSettings(new Settings.SlideSettings(points, null));
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        Slide result = deckService.setSlideAnswerSettings("deck-1", "s1", answerSettings(15), owner);

        assertThat(result.getSettings().answerSettings().countdownTime()).isEqualTo(15);
        assertThat(result.getSettings().pointSettings()).isSameAs(points);
    }

    @Test
    void setSlideSettingsRejectsUnknownSlideWithNotFound() {
        Deck deck = keyedDeck("owner-1", "s1");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        assertThatThrownBy(
                () -> deckService.setSlidePointSettings("deck-1", "missing", pointSettings(10), owner))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Slide not found");
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void setSlideSettingsRequiresEdit() {
        Deck deck = keyedDeck("someone-else", "s1");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        assertThatThrownBy(() -> deckService.setSlidePointSettings(
                "deck-1", "s1", pointSettings(10), principal("intruder")))
                .isInstanceOf(ForbiddenException.class);
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void updateSlidePreservesExistingSettings() {
        // Settings have a single owner in the settings endpoints; an updateSlide must
        // leave them alone rather than null them out — exactly like images.
        Deck deck = keyedDeck("owner-1", "s1");
        Slide existing = deck.findSlide("s1").orElseThrow();
        Settings.SlideSettings settings = new Settings.SlideSettings(pointSettings(20), null);
        existing.setSettings(settings);
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        Slide changes = slide("s1");
        changes.setTitle("Renamed slide"); // no settings carried

        Slide result = deckService.updateSlide("deck-1", "s1", changes, owner);

        assertThat(result.getTitle()).isEqualTo("Renamed slide");
        assertThat(result.getSettings()).isSameAs(settings);
    }

    // ── permissionsFor (the capabilities the client reads off the response) ──────

    @Test
    void permissionsForOwnerGrantsEverything() {
        Deck deck = deck("owner-1");

        ViewerPermissions perms = deckService.permissionsFor(deck, owner);

        assertThat(perms.canView()).isTrue();
        assertThat(perms.canEdit()).isTrue();
        assertThat(perms.canManage()).isTrue();
    }

    @Test
    void permissionsForStrangerOnPrivateDraftGrantsNothing() {
        Deck deck = deck("owner-1"); // fresh deck is PRIVATE + DRAFT

        ViewerPermissions perms = deckService.permissionsFor(deck, principal("intruder"));

        assertThat(perms.canView()).isFalse();
        assertThat(perms.canEdit()).isFalse();
        assertThat(perms.canManage()).isFalse();
    }

    @Test
    void permissionsForAclViewerCanViewButNotEditOrManage() {
        Deck deck = deck("owner-1");
        deck.getAcl().add(new DeckAccessGrant("viewer-1", DeckAclRole.VIEWER));

        ViewerPermissions perms = deckService.permissionsFor(deck, principal("viewer-1"));

        assertThat(perms.canView()).isTrue();
        assertThat(perms.canEdit()).isFalse();
        assertThat(perms.canManage()).isFalse();
    }

    // ── Fixtures ────────────────────────────────────────────────────────────────

    private static AmbiPrincipal principal(String userId) {
        return new AmbiPrincipal(IdentityState.REGISTERED, userId, "pub-" + userId,
                UserLevel.USER, AuthProvider.INTERNAL, null, null, "sid-" + userId);
    }

    private static Deck deck(String ownerId) {
        Deck deck = new Deck();
        deck.setId("deck-1");
        deck.setOwnership(new Ownership(OwnershipType.USER, ownerId));
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

    private static AppImage image(String externalSrc) {
        AppImage image = new AppImage();
        image.setExternal(true);
        image.setExternalSrc(externalSrc);
        return image;
    }

    private static Settings.PointSettings pointSettings(int points) {
        return new Settings.PointSettings(points, 0, 0, 0, null, false);
    }

    private static Settings.AnswerSettings answerSettings(int countdownTime) {
        return new Settings.AnswerSettings(false, false, false, false, countdownTime);
    }

    private static List<String> orderedIds(Deck deck) {
        return deck.getSlides().stream()
                .sorted(SlideRankService.ordering())
                .map(Slide::getId)
                .toList();
    }
}
