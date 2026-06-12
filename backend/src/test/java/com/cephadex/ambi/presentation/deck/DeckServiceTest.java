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
import static org.mockito.ArgumentMatchers.eq;
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
import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.deck.config.DeckDefaultsProperties;
import com.cephadex.ambi.presentation.deck.enums.DeckAclRole;
import com.cephadex.ambi.presentation.deck.enums.DeckVisibility;
import com.cephadex.ambi.presentation.deck.enums.DisplayLocation;
import com.cephadex.ambi.presentation.deck.enums.PublishStatus;
import com.cephadex.ambi.presentation.deck.enums.ResultsDisplayMode;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.SlideRankService;
import com.cephadex.ambi.presentation.slide.content.FollowUpContent;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.TextContent;
import com.cephadex.ambi.presentation.slide.content.TitleContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes;
import com.cephadex.ambi.presentation.slide.enums.FollowUpMode;
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
        deckService = new DeckService(deckRepository, userService, new SlideRankService(),
                new DeckDefaultsProperties());
        owner = principal("owner-1");
        // Echo back whatever the service saves — tests inspect the in-flight deck.
        when(deckRepository.save(any(Deck.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ── Create ─────────────────────────────────────────────────────────────────

    @Test
    void createAppliesDefaultSettingsAndMetadata() {
        Deck created = deckService.create("deck-1", owner);

        // The previously-missing piece: a new deck is no longer settings-null.
        assertThat(created.getSettings()).isNotNull()
                .isEqualTo(new DeckDefaultsProperties().deckSettings());
        assertThat(created.getName()).isEqualTo("Untitled Deck");
        assertThat(created.getLanguage()).isEqualTo("en");
        // Safety invariants stay PRIVATE + DRAFT (not config-driven).
        assertThat(created.getVisibility()).isEqualTo(DeckVisibility.PRIVATE);
        assertThat(created.getPublishStatus()).isEqualTo(PublishStatus.DRAFT);
        verify(deckRepository).save(created);
    }

    @Test
    void createHonorsConfiguredDefaults() {
        // Prove the tunable defaults flow through create(): override the config and
        // the new deck reflects it.
        DeckDefaultsProperties props = new DeckDefaultsProperties();
        props.setName("Custom Start");
        props.setLanguage("fr");
        props.getAnswer().setCountdownTime(45);
        props.getPoints().setPoints(500);
        DeckService service = new DeckService(deckRepository, userService,
                new SlideRankService(), props);

        Deck created = service.create("deck-1", owner);

        assertThat(created.getName()).isEqualTo("Custom Start");
        assertThat(created.getLanguage()).isEqualTo("fr");
        assertThat(created.getSettings().answerSettings().countdownTime()).isEqualTo(45);
        assertThat(created.getSettings().pointSettings().points()).isEqualTo(500);
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
    void moveSlidePersistsAndReturnsReorderedSlides() {
        Deck deck = keyedDeck("owner-1", "s1", "s2", "s3");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        List<Slide> result = deckService.moveSlide("deck-1", "s3", 0, owner);

        assertThat(result.stream().map(Slide::getId).toList())
                .containsExactly("s3", "s1", "s2");
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

    // ── Follow-up slides ─────────────────────────────────────────────────────────

    @Test
    void addFollowUpSlideLinksAndPositionsAfterParent() {
        Deck deck = deckWithMcq("owner-1", "s1", "s2");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        List<Slide> result = deckService.addFollowUpSlide(
                "deck-1", "s1", "f1", FollowUpMode.PREDICT_POPULAR, "Most popular?", owner);

        assertThat(result.stream().map(Slide::getId).toList()).containsExactly("s1", "f1", "s2");
        Slide followUp = deck.findSlide("f1").orElseThrow();
        assertThat(followUp.getParentId()).isEqualTo("s1");
        assertThat(deck.findSlide("s1").orElseThrow().getChildId()).isEqualTo("f1");
        assertThat(followUp.getContent()).isEqualTo(new FollowUpContent(FollowUpMode.PREDICT_POPULAR));
        assertThat(followUp.getTitle()).isEqualTo("Most popular?");
        assertThat(followUp.getCreatedByUserId()).isEqualTo("owner-1");
        verify(deckRepository).save(deck);
    }

    @Test
    void addFollowUpSlideMintsIdWhenAbsent() {
        Deck deck = deckWithMcq("owner-1", "s1");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        deckService.addFollowUpSlide("deck-1", "s1", null, FollowUpMode.PREDICT_POPULAR, null, owner);

        String childId = deck.findSlide("s1").orElseThrow().getChildId();
        assertThat(childId).isNotNull();
        assertThat(deck.findSlide(childId).orElseThrow().getTitle()).isEmpty();
    }

    @Test
    void addFollowUpSlideRejectsNonScorableParent() {
        Deck deck = keyedDeck("owner-1", "s1");
        deck.findSlide("s1").orElseThrow().setContent(new TitleContent());
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        assertThatThrownBy(() -> deckService.addFollowUpSlide(
                "deck-1", "s1", "f1", FollowUpMode.PREDICT_POPULAR, null, owner))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("scorable");
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void addFollowUpSlideRejectsModeInvalidForParentType() {
        // PREDICT_POPULAR needs a parent with predefined options; a TEXT parent
        // has none, so the mode is invalid for it.
        Deck deck = keyedDeck("owner-1", "s1");
        deck.findSlide("s1").orElseThrow().setContent(textContent());
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        assertThatThrownBy(() -> deckService.addFollowUpSlide(
                "deck-1", "s1", "f1", FollowUpMode.PREDICT_POPULAR, null, owner))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("not valid");
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void addFollowUpSlideRejectsSecondFollowUpWithConflict() {
        Deck deck = deckWithAttachedPair("owner-1", "p", "f");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        assertThatThrownBy(() -> deckService.addFollowUpSlide(
                "deck-1", "p", "f2", FollowUpMode.PREDICT_POPULAR, null, owner))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already has a follow-up");
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void addFollowUpSlideRejectsFollowUpAsParent() {
        Deck deck = deckWithAttachedPair("owner-1", "p", "f");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        assertThatThrownBy(() -> deckService.addFollowUpSlide(
                "deck-1", "f", "f2", FollowUpMode.PREDICT_POPULAR, null, owner))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("cannot have its own follow-up");
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void addFollowUpSlideRejectsUnknownParentWithNotFound() {
        Deck deck = deckWithMcq("owner-1", "s1");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        assertThatThrownBy(() -> deckService.addFollowUpSlide(
                "deck-1", "missing", "f1", FollowUpMode.PREDICT_POPULAR, null, owner))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void addFollowUpSlideRequiresEdit() {
        Deck deck = deckWithMcq("someone-else", "s1");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        assertThatThrownBy(() -> deckService.addFollowUpSlide(
                "deck-1", "s1", "f1", FollowUpMode.PREDICT_POPULAR, null, principal("intruder")))
                .isInstanceOf(ForbiddenException.class);
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void addFollowUpSlideHealsDanglingChildIdAndProceeds() {
        // Legacy client-written childId pointing at nothing: self-heal, attach.
        Deck deck = deckWithMcq("owner-1", "s1");
        deck.findSlide("s1").orElseThrow().setChildId("ghost");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        deckService.addFollowUpSlide("deck-1", "s1", "f1", FollowUpMode.PREDICT_POPULAR, null, owner);

        assertThat(deck.findSlide("s1").orElseThrow().getChildId()).isEqualTo("f1");
    }

    @Test
    void moveSlideRejectsAttachedFollowUp() {
        Deck deck = deckWithAttachedPair("owner-1", "p", "f");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        assertThatThrownBy(() -> deckService.moveSlide("deck-1", "f", 0, owner))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("moves with its parent");
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void moveSlideCarriesAttachedFollowUpAsUnit() {
        Deck deck = deckWithAttachedPair("owner-1", "p", "f", "s3");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        List<Slide> result = deckService.moveSlide("deck-1", "p", 2, owner);

        assertThat(result.stream().map(Slide::getId).toList()).containsExactly("s3", "p", "f");
    }

    @Test
    void updateSlideRejectsTurningRegularSlideIntoFollowUp() {
        Deck deck = deckWithMcq("owner-1", "s1");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));
        Slide changes = slide("s1");
        changes.setContent(new FollowUpContent(FollowUpMode.PREDICT_POPULAR));

        assertThatThrownBy(() -> deckService.updateSlide("deck-1", "s1", changes, owner))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("follow-up endpoint");
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void updateSlideRejectsFollowUpChangingKind() {
        Deck deck = deckWithAttachedPair("owner-1", "p", "f");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));
        Slide changes = slide("f");
        changes.setContent(new TitleContent());

        assertThatThrownBy(() -> deckService.updateSlide("deck-1", "f", changes, owner))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("cannot change");
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void updateSlideRejectsFollowUpModeInvalidForParent() {
        // A BEST_ANSWER_VOTE follow-up on a TEXT parent can't switch to
        // PREDICT_POPULAR — that mode needs a parent with predefined options.
        Deck deck = deckWithAttachedPair("owner-1", "p", "f");
        deck.findSlide("p").orElseThrow().setContent(textContent());
        deck.findSlide("f").orElseThrow()
                .setContent(new FollowUpContent(FollowUpMode.BEST_ANSWER_VOTE));
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));
        Slide changes = slide("f");
        changes.setContent(new FollowUpContent(FollowUpMode.PREDICT_POPULAR));

        assertThatThrownBy(() -> deckService.updateSlide("deck-1", "f", changes, owner))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("not valid");
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void updateSlideAllowsFollowUpModeChangeWithinValidModes() {
        // MCQ parents support both modes, so a follow-up can switch between them.
        Deck deck = deckWithAttachedPair("owner-1", "p", "f");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));
        Slide changes = slide("f");
        changes.setTitle("Which answer was best?");
        changes.setContent(new FollowUpContent(FollowUpMode.BEST_ANSWER_VOTE));

        Slide updated = deckService.updateSlide("deck-1", "f", changes, owner);

        assertThat(updated.getTitle()).isEqualTo("Which answer was best?");
        assertThat(updated.getContent())
                .isEqualTo(new FollowUpContent(FollowUpMode.BEST_ANSWER_VOTE));
        // The link is server-owned and survives the update untouched.
        assertThat(updated.getParentId()).isEqualTo("p");
        verify(deckRepository).save(deck);
    }

    @Test
    void updateSlideRejectsParentTypeChangeThatInvalidatesChildMode() {
        Deck deck = deckWithAttachedPair("owner-1", "p", "f");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));
        Slide changes = slide("p");
        changes.setContent(new TitleContent());

        assertThatThrownBy(() -> deckService.updateSlide("deck-1", "p", changes, owner))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("invalidate its follow-up");
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void removeSlideCascadesAttachedFollowUpAndSaves() {
        Deck deck = deckWithAttachedPair("owner-1", "p", "f", "s3");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        deckService.removeSlide("deck-1", "p", owner);

        assertThat(orderedIds(deck)).containsExactly("s3");
        verify(deckRepository).save(deck);
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

    // ── Slide background (three-state override) ─────────────────────────────────

    @Test
    void hideSlideBackgroundSuppressesDeckDefaultAndDropsOwnImage() {
        Deck deck = keyedDeck("owner-1", "s1");
        Slide existing = deck.findSlide("s1").orElseThrow();
        existing.setBackgroundImage(image("https://img/slide-bg.jpg"));
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        Slide result = deckService.hideSlideBackground("deck-1", "s1", owner);

        assertThat(result.getBackgroundImage()).isNull();
        assertThat(result.isHideBackground()).isTrue();
        verify(deckRepository).save(deck);
    }

    @Test
    void setSlideBackgroundImageClearsTheSuppressFlag() {
        // An explicit image always wins, so setting one must lift a prior "hidden".
        Deck deck = keyedDeck("owner-1", "s1");
        Slide existing = deck.findSlide("s1").orElseThrow();
        existing.setHideBackground(true);
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        AppImage bg = image("https://img/slide-bg.jpg");
        Slide result = deckService.setSlideBackgroundImage("deck-1", "s1", bg, owner);

        assertThat(result.getBackgroundImage()).isSameAs(bg);
        assertThat(result.isHideBackground()).isFalse();
    }

    @Test
    void clearSlideBackgroundImageResetsToDeckInherit() {
        // "Reset to deck" drops both the image and the suppress flag, unlike hide.
        Deck deck = keyedDeck("owner-1", "s1");
        Slide existing = deck.findSlide("s1").orElseThrow();
        existing.setHideBackground(true);
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        Slide result = deckService.clearSlideBackgroundImage("deck-1", "s1", owner);

        assertThat(result.getBackgroundImage()).isNull();
        assertThat(result.isHideBackground()).isFalse();
    }

    @Test
    void promoteBackgroundImageClearsEveryOverrideIncludingHideFlags() {
        Deck deck = keyedDeck("owner-1", "s1", "s2");
        deck.findSlide("s1").orElseThrow().setBackgroundImage(image("https://img/s1.jpg"));
        deck.findSlide("s2").orElseThrow().setHideBackground(true);
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        AppImage promoted = image("https://img/deck.jpg");
        Deck result = deckService.promoteBackgroundImageToDeck("deck-1", promoted, owner);

        assertThat(result.getBackgroundImage()).isSameAs(promoted);
        assertThat(result.getSlides())
                .allSatisfy(s -> {
                    assertThat(s.getBackgroundImage()).isNull();
                    assertThat(s.isHideBackground()).isFalse();
                });
        verify(deckRepository).promoteBackgroundImageToDeck("deck-1", promoted);
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
    void setSlidePointSettingsStampsAuditAndPersistsTargeted() {
        Deck deck = keyedDeck("owner-1", "s1");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));
        Settings.PointSettings points = pointSettings(100);

        Slide result = deckService.setSlidePointSettings("deck-1", "s1", points, owner);

        assertThat(result.getSettings().pointSettings()).isSameAs(points);
        assertThat(result.getLastEditedByUserId()).isEqualTo("owner-1");
        // Persists via the targeted positional update (no deck @Version bump),
        // not a whole-deck save.
        verify(deckRepository).updateSlideSettings(
                eq("deck-1"), eq("s1"), eq(new Settings.SlideSettings(points, null)), eq("owner-1"));
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void clearSlidePointSettingsPersistsTargetedWithoutSaving() {
        Deck deck = keyedDeck("owner-1", "s1");
        Slide existing = deck.findSlide("s1").orElseThrow();
        existing.setSettings(new Settings.SlideSettings(pointSettings(20), null));
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        deckService.clearSlidePointSettings("deck-1", "s1", owner);

        // Both halves now absent → the wrapper collapses to null, persisted as an
        // unset of the slide's settings sub-document.
        verify(deckRepository).updateSlideSettings(eq("deck-1"), eq("s1"), eq(null), eq("owner-1"));
        verify(deckRepository, never()).save(any(Deck.class));
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

    // ── Deck settings ─────────────────────────────────────────────────────────────
    // Deck-level defaults persist through targeted sub-path updates, NOT a
    // whole-deck save: the response reflects the in-memory mutation while the deck
    // @Version is left untouched (no deckRepository.save).

    @Test
    void setDeckAnswerSettingsPersistsTargetedWithoutSaving() {
        Deck deck = deck("owner-1");
        deck.setSettings(new Settings.DeckSettings(
                pointSettings(50), answerSettings(10), audienceSettings(8), inviteSettings(true)));
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));
        Settings.AnswerSettings answers = answerSettings(30);

        Deck result = deckService.setDeckAnswerSettings("deck-1", answers, owner);

        // In-memory answer half replaced; point + audience + invite halves preserved.
        assertThat(result.getSettings().answerSettings()).isSameAs(answers);
        assertThat(result.getSettings().pointSettings().points()).isEqualTo(50);
        assertThat(result.getSettings().audienceSettings().maxParticipants()).isEqualTo(8);
        assertThat(result.getSettings().inviteSettings().enableQr()).isTrue();
        verify(deckRepository).updateDeckAnswerSettings("deck-1", answers);
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void setDeckPointSettingsPersistsTargetedWithoutSaving() {
        Deck deck = deck("owner-1");
        deck.setSettings(new Settings.DeckSettings(pointSettings(50), answerSettings(10), null, null));
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));
        Settings.PointSettings points = pointSettings(200);

        Deck result = deckService.setDeckPointSettings("deck-1", points, owner);

        assertThat(result.getSettings().pointSettings()).isSameAs(points);
        assertThat(result.getSettings().answerSettings().countdownTime()).isEqualTo(10);
        verify(deckRepository).updateDeckPointSettings("deck-1", points);
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void setDeckAudienceSettingsHandlesNullCurrentSettings() {
        Deck deck = deck("owner-1"); // settings null
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));
        Settings.AudienceSettings audience = audienceSettings(25);

        Deck result = deckService.setDeckAudienceSettings("deck-1", audience, owner);

        assertThat(result.getSettings().audienceSettings()).isSameAs(audience);
        assertThat(result.getSettings().pointSettings()).isNull();
        assertThat(result.getSettings().answerSettings()).isNull();
        verify(deckRepository).updateDeckAudienceSettings("deck-1", audience);
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void setDeckInviteSettingsHandlesNullCurrentSettings() {
        Deck deck = deck("owner-1"); // settings null
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));
        Settings.InviteSettings invite = inviteSettings(false);

        Deck result = deckService.setDeckInviteSettings("deck-1", invite, owner);

        assertThat(result.getSettings().inviteSettings()).isSameAs(invite);
        assertThat(result.getSettings().pointSettings()).isNull();
        assertThat(result.getSettings().answerSettings()).isNull();
        assertThat(result.getSettings().audienceSettings()).isNull();
        verify(deckRepository).updateDeckInviteSettings("deck-1", invite);
        verify(deckRepository, never()).save(any(Deck.class));
    }

    @Test
    void setDeckSettingsRequiresEdit() {
        Deck deck = deck("owner-1");
        when(deckRepository.findById("deck-1")).thenReturn(Optional.of(deck));

        assertThatThrownBy(() -> deckService.setDeckAnswerSettings(
                "deck-1", answerSettings(10), principal("intruder")))
                .isInstanceOf(ForbiddenException.class);
        verify(deckRepository, never()).updateDeckAnswerSettings(any(), any());
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

    /** A keyed deck whose slides all carry (empty) MCQ content. */
    private Deck deckWithMcq(String ownerId, String... slideIds) {
        Deck deck = keyedDeck(ownerId, slideIds);
        deck.getSlides().forEach(s -> s.setContent(mcqContent()));
        return deck;
    }

    /**
     * A keyed deck opening with a valid attached pair: an MCQ parent and its
     * PREDICT_POPULAR follow-up, then the given plain MCQ slides.
     */
    private Deck deckWithAttachedPair(String ownerId, String parentId, String followUpId,
            String... restIds) {
        String[] all = new String[restIds.length + 2];
        all[0] = parentId;
        all[1] = followUpId;
        System.arraycopy(restIds, 0, all, 2, restIds.length);
        Deck deck = deckWithMcq(ownerId, all);
        Slide parent = deck.findSlide(parentId).orElseThrow();
        Slide followUp = deck.findSlide(followUpId).orElseThrow();
        followUp.setContent(new FollowUpContent(FollowUpMode.PREDICT_POPULAR));
        parent.setChildId(followUpId);
        followUp.setParentId(parentId);
        return deck;
    }

    private static McqContent mcqContent() {
        return new McqContent(List.of(), Set.of(),
                SlideContentTypes.McqDataVisualization.NONE);
    }

    private static TextContent textContent() {
        return new TextContent(Set.of(), SlideContentTypes.MatchMode.EXACT,
                false, true, null);
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
        return new Settings.AnswerSettings(ResultsDisplayMode.ROUND_END, false, false, false, countdownTime, false, 1);
    }

    private static Settings.AudienceSettings audienceSettings(int maxParticipants) {
        return new Settings.AudienceSettings(maxParticipants, false, false, false, false, false, false);
    }

    private static Settings.InviteSettings inviteSettings(boolean enableQr) {
        return new Settings.InviteSettings(
                enableQr, Set.of(DisplayLocation.LOBBY), true, Set.of(DisplayLocation.HEADER));
    }

    private static List<String> orderedIds(Deck deck) {
        return deck.getSlides().stream()
                .sorted(SlideRankService.ordering())
                .map(Slide::getId)
                .toList();
    }
}
