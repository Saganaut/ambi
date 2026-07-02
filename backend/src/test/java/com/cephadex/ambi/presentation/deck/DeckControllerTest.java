package com.cephadex.ambi.presentation.deck;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.Ownership;
import com.cephadex.ambi.common.enums.OwnershipType;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.deck.enums.DeckAclRole;
import com.cephadex.ambi.presentation.deck.enums.DeckVisibility;
import com.cephadex.ambi.presentation.deck.enums.ResultsDisplayMode;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.TitleContent;
import com.cephadex.ambi.presentation.slide.content.parts.block.HeadingBlock;
import com.cephadex.ambi.presentation.slide.content.parts.block.SlideBlock;
import com.cephadex.ambi.presentation.slide.enums.FollowUpMode;
import com.cephadex.ambi.presentation.slide.enums.SlideType;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Controller-plumbing tests (routing, status codes, DTO mapping) in isolation
 * via standalone {@code MockMvc}, mirroring {@code AuthControllerTest}. The
 * permission semantics live in {@code DeckService} (and the aggregate's pure
 * predicates) and are tested there; here {@code DeckService} is mocked, so these
 * assert only that each route delegates correctly and serializes the result.
 *
 * <p>The load-bearing case is {@link #updateCarriesExistingSlidesThrough}: the
 * controller must hand the deck's current slides to the (frozen) service so a
 * metadata-only edit never wipes them.
 */
@ExtendWith(MockitoExtension.class)
class DeckControllerTest {

    @Mock
    private DeckService deckService;

    private MockMvc mockMvc;
    private AmbiPrincipal principal;

    @BeforeEach
    void setUp() {
        principal = new AmbiPrincipal(
                IdentityState.REGISTERED, "user-1", "pub-1", UserLevel.USER,
                AuthProvider.INTERNAL, null, null, "sid-1");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));

        DeckController controller = new DeckController(deckService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(
                        new AuthenticationPrincipalArgumentResolver(),
                        new PageableHandlerMethodArgumentResolver())
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ── Deck CRUD ─────────────────────────────────────────────────────────────

    @Test
    void createReturns200AndMetadataWithoutSlides() throws Exception {
        when(deckService.create(eq("deck-1"), any())).thenReturn(deck("deck-1"));

        mockMvc.perform(put("/api/decks/deck-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("deck-1"))
                .andExpect(jsonPath("$.publicId").value("pub-deck-1"))
                .andExpect(jsonPath("$.slides").doesNotExist());
    }

    @Test
    void createIsIdempotentOnDuplicateId() throws Exception {
        // A resend of the same id: create's insert hits the _id unique index.
        when(deckService.create(eq("deck-1"), any()))
                .thenThrow(new DuplicateKeyException("E11000 duplicate key on _id"));
        when(deckService.getViewable(eq("deck-1"), any())).thenReturn(deck("deck-1"));

        mockMvc.perform(put("/api/decks/deck-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("deck-1"));

        verify(deckService).getViewable(eq("deck-1"), any());
    }

    @Test
    void getDeckReturns200() throws Exception {
        when(deckService.getViewable(eq("deck-1"), any())).thenReturn(deck("deck-1"));

        mockMvc.perform(get("/api/decks/deck-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("deck-1"));
    }

    @Test
    void updateDelegatesParsedMetadataAndReturnsMetadataOnly() throws Exception {
        // The controller parses the body into a metadata-only `changes` deck and
        // hands it to the service; slides (and images) are preserved by the
        // service against the loaded deck, not carried through the request. See
        // DeckServiceTest#updatePreservesExistingDeckImages.
        Deck saved = deck("deck-1");
        saved.setName("Renamed");
        when(deckService.update(eq("deck-1"), any(Deck.class), any())).thenReturn(saved);

        mockMvc.perform(patch("/api/decks/deck-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Renamed\",\"language\":\"en\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Renamed"))
                .andExpect(jsonPath("$.slides").doesNotExist());

        ArgumentCaptor<Deck> changes = ArgumentCaptor.forClass(Deck.class);
        verify(deckService).update(eq("deck-1"), changes.capture(), any());
        assertThat(changes.getValue().getName()).isEqualTo("Renamed");
    }

    @Test
    void deleteReturns204() throws Exception {
        mockMvc.perform(delete("/api/decks/deck-1"))
                .andExpect(status().isNoContent());
        verify(deckService).delete(eq("deck-1"), any());
    }

    // ── Management ────────────────────────────────────────────────────────────

    @Test
    void setVisibilityDelegatesEnum() throws Exception {
        when(deckService.setVisibility(eq("deck-1"), eq(DeckVisibility.PUBLIC), any()))
                .thenReturn(deck("deck-1"));

        mockMvc.perform(put("/api/decks/deck-1/visibility")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"visibility\":\"PUBLIC\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("deck-1"));

        verify(deckService).setVisibility(eq("deck-1"), eq(DeckVisibility.PUBLIC), any());
    }

    @Test
    void shareUpsertsGrantFromPathAndBody() throws Exception {
        when(deckService.share(eq("deck-1"), eq("user-9"), eq(DeckAclRole.EDITOR), any()))
                .thenReturn(deck("deck-1"));

        mockMvc.perform(put("/api/decks/deck-1/shares/user-9")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"EDITOR\"}"))
                .andExpect(status().isOk());

        verify(deckService).share(eq("deck-1"), eq("user-9"), eq(DeckAclRole.EDITOR), any());
    }

    @Test
    void revokeShareReturns200() throws Exception {
        when(deckService.revokeShare(eq("deck-1"), eq("user-9"), any()))
                .thenReturn(deck("deck-1"));

        mockMvc.perform(delete("/api/decks/deck-1/shares/user-9"))
                .andExpect(status().isOk());

        verify(deckService).revokeShare(eq("deck-1"), eq("user-9"), any());
    }

    // ── Deck images ───────────────────────────────────────────────────────────

    @Test
    void setDeckCoverImageDelegates() throws Exception {
        when(deckService.setDeckCoverImage(eq("deck-1"), any(AppImage.class), any()))
                .thenReturn(deck("deck-1"));

        mockMvc.perform(put("/api/decks/deck-1/cover-image")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"image\":{\"external\":true,\"externalSrc\":\"https://img/c.jpg\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("deck-1"));

        verify(deckService).setDeckCoverImage(eq("deck-1"), any(AppImage.class), any());
    }

    @Test
    void clearDeckCoverImageDelegates() throws Exception {
        when(deckService.clearDeckCoverImage(eq("deck-1"), any())).thenReturn(deck("deck-1"));

        mockMvc.perform(delete("/api/decks/deck-1/cover-image"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("deck-1"));

        verify(deckService).clearDeckCoverImage(eq("deck-1"), any());
    }

    @Test
    void setDeckBackgroundImageDelegates() throws Exception {
        when(deckService.setDeckBackgroundImage(eq("deck-1"), any(AppImage.class), any()))
                .thenReturn(deck("deck-1"));

        mockMvc.perform(put("/api/decks/deck-1/background-image")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"image\":{\"external\":true,\"externalSrc\":\"https://img/b.jpg\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("deck-1"));

        verify(deckService).setDeckBackgroundImage(eq("deck-1"), any(AppImage.class), any());
    }

    @Test
    void clearDeckBackgroundImageDelegates() throws Exception {
        when(deckService.clearDeckBackgroundImage(eq("deck-1"), any())).thenReturn(deck("deck-1"));

        mockMvc.perform(delete("/api/decks/deck-1/background-image"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("deck-1"));

        verify(deckService).clearDeckBackgroundImage(eq("deck-1"), any());
    }

    /** A null image body is rejected — clearing is an explicit DELETE, not a null PUT. */
    @Test
    void setDeckCoverImageRejectsMissingImage() throws Exception {
        mockMvc.perform(put("/api/decks/deck-1/cover-image")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    // ── Slide images ──────────────────────────────────────────────────────────

    @Test
    void setSlideCoverImageDelegates() throws Exception {
        when(deckService.setSlideCoverImage(eq("deck-1"), eq("s1"), any(AppImage.class), any()))
                .thenReturn(slide("s1"));

        mockMvc.perform(put("/api/decks/deck-1/slides/s1/cover-image")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"image\":{\"external\":true,\"externalSrc\":\"https://img/c.jpg\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("s1"));

        verify(deckService).setSlideCoverImage(eq("deck-1"), eq("s1"), any(AppImage.class), any());
    }

    @Test
    void clearSlideCoverImageDelegates() throws Exception {
        when(deckService.clearSlideCoverImage(eq("deck-1"), eq("s1"), any())).thenReturn(slide("s1"));

        mockMvc.perform(delete("/api/decks/deck-1/slides/s1/cover-image"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("s1"));

        verify(deckService).clearSlideCoverImage(eq("deck-1"), eq("s1"), any());
    }

    @Test
    void setSlideBackgroundImageDelegates() throws Exception {
        when(deckService.setSlideBackgroundImage(eq("deck-1"), eq("s1"), any(AppImage.class), any()))
                .thenReturn(slide("s1"));

        mockMvc.perform(put("/api/decks/deck-1/slides/s1/background-image")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"image\":{\"external\":true,\"externalSrc\":\"https://img/b.jpg\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("s1"));

        verify(deckService).setSlideBackgroundImage(eq("deck-1"), eq("s1"), any(AppImage.class), any());
    }

    @Test
    void clearSlideBackgroundImageDelegates() throws Exception {
        when(deckService.clearSlideBackgroundImage(eq("deck-1"), eq("s1"), any())).thenReturn(slide("s1"));

        mockMvc.perform(delete("/api/decks/deck-1/slides/s1/background-image"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("s1"));

        verify(deckService).clearSlideBackgroundImage(eq("deck-1"), eq("s1"), any());
    }

    @Test
    void hideSlideBackgroundDelegates() throws Exception {
        when(deckService.hideSlideBackground(eq("deck-1"), eq("s1"), any())).thenReturn(slide("s1"));

        mockMvc.perform(put("/api/decks/deck-1/slides/s1/background-image/hide"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("s1"));

        verify(deckService).hideSlideBackground(eq("deck-1"), eq("s1"), any());
    }

    // ── Background color ───────────────────────────────────────────────────────

    @Test
    void setDeckBackgroundColorDelegates() throws Exception {
        when(deckService.setDeckBackgroundColor(eq("deck-1"), eq("#1A2B3C"), any()))
                .thenReturn(deck("deck-1"));

        mockMvc.perform(put("/api/decks/deck-1/background-color")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"color\":\"#1A2B3C\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("deck-1"));

        verify(deckService).setDeckBackgroundColor(eq("deck-1"), eq("#1A2B3C"), any());
    }

    @Test
    void clearDeckBackgroundColorDelegates() throws Exception {
        when(deckService.clearDeckBackgroundColor(eq("deck-1"), any())).thenReturn(deck("deck-1"));

        mockMvc.perform(delete("/api/decks/deck-1/background-color"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("deck-1"));

        verify(deckService).clearDeckBackgroundColor(eq("deck-1"), any());
    }

    @Test
    void promoteBackgroundColorToDeckDelegates() throws Exception {
        when(deckService.promoteBackgroundColorToDeck(eq("deck-1"), eq("#1A2B3C"), any()))
                .thenReturn(deck("deck-1"));

        mockMvc.perform(put("/api/decks/deck-1/background-color/promote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"color\":\"#1A2B3C\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("deck-1"));

        verify(deckService).promoteBackgroundColorToDeck(eq("deck-1"), eq("#1A2B3C"), any());
    }

    /** A malformed (non-hex) color is rejected by the @Pattern bound. */
    @Test
    void setDeckBackgroundColorRejectsBadHex() throws Exception {
        mockMvc.perform(put("/api/decks/deck-1/background-color")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"color\":\"red\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void setSlideBackgroundColorDelegates() throws Exception {
        when(deckService.setSlideBackgroundColor(eq("deck-1"), eq("s1"), eq("#1A2B3C"), any()))
                .thenReturn(slide("s1"));

        mockMvc.perform(put("/api/decks/deck-1/slides/s1/background-color")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"color\":\"#1A2B3C\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("s1"));

        verify(deckService).setSlideBackgroundColor(eq("deck-1"), eq("s1"), eq("#1A2B3C"), any());
    }

    @Test
    void clearSlideBackgroundColorDelegates() throws Exception {
        when(deckService.clearSlideBackgroundColor(eq("deck-1"), eq("s1"), any())).thenReturn(slide("s1"));

        mockMvc.perform(delete("/api/decks/deck-1/slides/s1/background-color"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("s1"));

        verify(deckService).clearSlideBackgroundColor(eq("deck-1"), eq("s1"), any());
    }

    // ── Slide point settings ──────────────────────────────────────────────────

    @Test
    void getSlidePointSettingsProjectsOverride() throws Exception {
        when(deckService.getSlide(eq("deck-1"), eq("s1"), any()))
                .thenReturn(slideWithSettings("s1", pointSettings(50), null));

        mockMvc.perform(get("/api/decks/deck-1/slides/s1/point-settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slideId").value("s1"))
                .andExpect(jsonPath("$.pointSettings.points").value(50));
    }

    @Test
    void setSlidePointSettingsDelegatesParsedRecord() throws Exception {
        when(deckService.setSlidePointSettings(eq("deck-1"), eq("s1"),
                any(Settings.PointSettings.class), any()))
                .thenReturn(slideWithSettings("s1", pointSettings(75), null));

        // Full-object PUT: under Jackson 3 every primitive component must be present
        // (FAIL_ON_NULL_FOR_PRIMITIVES is on by default) — see backend-rules.
        mockMvc.perform(put("/api/decks/deck-1/slides/s1/point-settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pointSettings\":{\"points\":75,\"deceptionPoints\":0,"
                                + "\"bestAnswerPoints\":0,\"fastestCorrectAnswerPoints\":0,"
                                + "\"streakBonuses\":{},\"resetStreakOnStreakEnd\":false}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slideId").value("s1"))
                .andExpect(jsonPath("$.pointSettings.points").value(75));

        ArgumentCaptor<Settings.PointSettings> sent = ArgumentCaptor.forClass(Settings.PointSettings.class);
        verify(deckService).setSlidePointSettings(eq("deck-1"), eq("s1"), sent.capture(), any());
        assertThat(sent.getValue().points()).isEqualTo(75);
    }

    /** A null body is rejected — clearing is an explicit DELETE, not a null PUT. */
    @Test
    void setSlidePointSettingsRejectsMissingBody() throws Exception {
        mockMvc.perform(put("/api/decks/deck-1/slides/s1/point-settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void clearSlidePointSettingsDelegates() throws Exception {
        when(deckService.clearSlidePointSettings(eq("deck-1"), eq("s1"), any()))
                .thenReturn(slide("s1"));

        mockMvc.perform(delete("/api/decks/deck-1/slides/s1/point-settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slideId").value("s1"))
                .andExpect(jsonPath("$.pointSettings").doesNotExist());

        verify(deckService).clearSlidePointSettings(eq("deck-1"), eq("s1"), any());
    }

    // ── Slide answer settings ─────────────────────────────────────────────────

    @Test
    void getSlideAnswerSettingsProjectsOverride() throws Exception {
        when(deckService.getSlide(eq("deck-1"), eq("s1"), any()))
                .thenReturn(slideWithSettings("s1", null, answerSettings(30)));

        mockMvc.perform(get("/api/decks/deck-1/slides/s1/answer-settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slideId").value("s1"))
                .andExpect(jsonPath("$.answerSettings.countdownTime").value(30));
    }

    @Test
    void setSlideAnswerSettingsDelegatesParsedRecord() throws Exception {
        when(deckService.setSlideAnswerSettings(eq("deck-1"), eq("s1"),
                any(Settings.AnswerSettings.class), any()))
                .thenReturn(slideWithSettings("s1", null, answerSettings(20)));

        // Full-object PUT: under Jackson 3 every primitive component must be present
        // (FAIL_ON_NULL_FOR_PRIMITIVES is on by default) — see backend-rules.
        mockMvc.perform(put("/api/decks/deck-1/slides/s1/answer-settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answerSettings\":{\"displayResultsMode\":\"ROUND_END\","
                                + "\"displayResultsAsPercentage\":false,\"shuffleOptions\":true,"
                                + "\"anonymizeAnswers\":false,\"countdownTime\":20,"
                                + "\"allowAnonymous\":false,\"maxSelections\":1}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slideId").value("s1"))
                .andExpect(jsonPath("$.answerSettings.countdownTime").value(20));

        ArgumentCaptor<Settings.AnswerSettings> sent = ArgumentCaptor.forClass(Settings.AnswerSettings.class);
        verify(deckService).setSlideAnswerSettings(eq("deck-1"), eq("s1"), sent.capture(), any());
        assertThat(sent.getValue().countdownTime()).isEqualTo(20);
        assertThat(sent.getValue().shuffleOptions()).isTrue();
    }

    @Test
    void setSlideAnswerSettingsRejectsMissingBody() throws Exception {
        mockMvc.perform(put("/api/decks/deck-1/slides/s1/answer-settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void clearSlideAnswerSettingsDelegates() throws Exception {
        when(deckService.clearSlideAnswerSettings(eq("deck-1"), eq("s1"), any()))
                .thenReturn(slide("s1"));

        mockMvc.perform(delete("/api/decks/deck-1/slides/s1/answer-settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slideId").value("s1"))
                .andExpect(jsonPath("$.answerSettings").doesNotExist());

        verify(deckService).clearSlideAnswerSettings(eq("deck-1"), eq("s1"), any());
    }

    // ── Slides ──────────────────────────────────────────────────────────────────

    @Test
    void listSlidesReturnsArray() throws Exception {
        when(deckService.listSlides(eq("deck-1"), any()))
                .thenReturn(List.of(slide("s1"), slide("s2")));

        mockMvc.perform(get("/api/decks/deck-1/slides"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("s1"))
                .andExpect(jsonPath("$[1].id").value("s2"));
    }

    @Test
    void addSlideReturns201AndPassesClientMintedId() throws Exception {
        when(deckService.addSlide(eq("deck-1"), any(Slide.class), any()))
                .thenReturn(slide("client-slide"));

        mockMvc.perform(post("/api/decks/deck-1/slides")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":\"client-slide\",\"title\":\"Q1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("client-slide"));

        ArgumentCaptor<Slide> sent = ArgumentCaptor.forClass(Slide.class);
        verify(deckService).addSlide(eq("deck-1"), sent.capture(), any());
        assertThat(sent.getValue().getId()).isEqualTo("client-slide");
        assertThat(sent.getValue().getTitle()).isEqualTo("Q1");
    }

    @Test
    void addSlideRoundTripsMcqContentAsDiscriminatedUnion() throws Exception {
        // Echo the deserialized slide back so a single request exercises both
        // halves of the polymorphic content contract: inbound the `contentType`
        // discriminator must resolve to McqContent, outbound McqContent must
        // re-serialize with `contentType` so the client sees the union arm.
        when(deckService.addSlide(eq("deck-1"), any(Slide.class), any()))
                .thenAnswer(invocation -> invocation.getArgument(1));

        String body = """
                {
                  "id": "mcq-1",
                  "content": {
                    "contentType": "MCQ",
                    "options": [{"id": "o1", "text": "Frodo"}],
                    "correctOptionIds": ["o1"]
                  }
                }
                """;

        mockMvc.perform(post("/api/decks/deck-1/slides")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content.contentType").value("MCQ"))
                .andExpect(jsonPath("$.content.options[0].id").value("o1"))
                .andExpect(jsonPath("$.content.correctOptionIds[0]").value("o1"));

        ArgumentCaptor<Slide> sent = ArgumentCaptor.forClass(Slide.class);
        verify(deckService).addSlide(eq("deck-1"), sent.capture(), any());
        assertThat(sent.getValue().getContent()).isInstanceOf(McqContent.class);
        McqContent mcq = (McqContent) sent.getValue().getContent();
        assertThat(mcq.contentType()).isEqualTo(SlideType.MCQ);
        assertThat(mcq.correctOptionIds()).containsExactly("o1");
    }

    @Test
    void addSlideRoundTripsTitleContentBlocksAsDiscriminatedUnion() throws Exception {
        // A content (TITLE) slide's body is a polymorphic List<SlideBlock>. Echo
        // the deserialized slide back so one request exercises both halves: inbound
        // the `kind` discriminator on each block must resolve to its concrete type,
        // outbound each block must re-serialize carrying `kind` so the client sees
        // the block union arm.
        when(deckService.addSlide(eq("deck-1"), any(Slide.class), any()))
                .thenAnswer(invocation -> invocation.getArgument(1));

        String body = """
                {
                  "id": "title-1",
                  "content": {
                    "contentType": "TITLE",
                    "blocks": [
                      {"kind": "HeadingBlock", "id": "b1", "text": "Welcome", "level": 1},
                      {"kind": "BodyBlock", "id": "b2", "richBody": "<p>Hi</p>"},
                      {"kind": "BulletListBlock", "id": "b3", "items": ["one", "two"]},
                      {"kind": "ImageBlock", "id": "b4", "caption": "A map"},
                      {"kind": "CalloutBlock", "id": "b5", "tone": "WARN", "richBody": "<p>Note</p>"}
                    ]
                  }
                }
                """;

        mockMvc.perform(post("/api/decks/deck-1/slides")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content.contentType").value("TITLE"))
                .andExpect(jsonPath("$.content.blocks[0].kind").value("HeadingBlock"))
                .andExpect(jsonPath("$.content.blocks[0].text").value("Welcome"))
                .andExpect(jsonPath("$.content.blocks[2].kind").value("BulletListBlock"))
                .andExpect(jsonPath("$.content.blocks[4].kind").value("CalloutBlock"))
                .andExpect(jsonPath("$.content.blocks[4].tone").value("WARN"));

        ArgumentCaptor<Slide> sent = ArgumentCaptor.forClass(Slide.class);
        verify(deckService).addSlide(eq("deck-1"), sent.capture(), any());
        assertThat(sent.getValue().getContent()).isInstanceOf(TitleContent.class);
        TitleContent title = (TitleContent) sent.getValue().getContent();
        assertThat(title.contentType()).isEqualTo(SlideType.TITLE);
        assertThat(title.blocks()).hasSize(5);
        SlideBlock first = title.blocks().get(0);
        assertThat(first).isInstanceOf(HeadingBlock.class);
        assertThat(((HeadingBlock) first).text()).isEqualTo("Welcome");
    }

    @Test
    void addFollowUpSlideReturns201AndCanonicalSlideList() throws Exception {
        when(deckService.addFollowUpSlide(
                eq("deck-1"), eq("s1"), eq("f1"), eq(FollowUpMode.PREDICT_POPULAR),
                eq("Most popular?"), any()))
                .thenReturn(List.of(slide("s1"), slide("f1"), slide("s2")));

        mockMvc.perform(post("/api/decks/deck-1/slides/s1/follow-up")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":\"f1\",\"mode\":\"PREDICT_POPULAR\",\"title\":\"Most popular?\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[1].id").value("f1"));

        verify(deckService).addFollowUpSlide(
                eq("deck-1"), eq("s1"), eq("f1"), eq(FollowUpMode.PREDICT_POPULAR),
                eq("Most popular?"), any());
    }

    @Test
    void addFollowUpSlideRejectsMissingModeWith400() throws Exception {
        mockMvc.perform(post("/api/decks/deck-1/slides/s1/follow-up")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":\"f1\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateSlideReturns200() throws Exception {
        when(deckService.updateSlide(eq("deck-1"), eq("s1"), any(Slide.class), any()))
                .thenReturn(slide("s1"));

        mockMvc.perform(put("/api/decks/deck-1/slides/s1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Renamed slide\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("s1"));
    }

    @Test
    void moveDelegatesToServiceAndReturnsReorderedSlides() throws Exception {
        when(deckService.moveSlide(eq("deck-1"), eq("s1"), eq(2), any()))
                .thenReturn(List.of(slide("s2"), slide("s3"), slide("s1")));

        mockMvc.perform(patch("/api/decks/deck-1/slides/s1/move")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"to\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value("s2"))
                .andExpect(jsonPath("$[2].id").value("s1"));

        verify(deckService).moveSlide(eq("deck-1"), eq("s1"), eq(2), any());
    }

    @Test
    void removeSlideReturns204() throws Exception {
        mockMvc.perform(delete("/api/decks/deck-1/slides/s1"))
                .andExpect(status().isNoContent());
        verify(deckService).removeSlide(eq("deck-1"), eq("s1"), any());
    }

    // ── Listings ──────────────────────────────────────────────────────────────

    @Test
    void listMineUsesPrincipalIdNotInput() throws Exception {
        when(deckService.listOwnedByUser("user-1")).thenReturn(List.of(deck("d1")));

        mockMvc.perform(get("/api/decks/mine"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("d1"));

        verify(deckService).listOwnedByUser("user-1");
    }

    @Test
    void listForOrgReadsOrgIdParam() throws Exception {
        when(deckService.listForOrg(eq("org-9"), any())).thenReturn(List.of(deck("d2")));

        mockMvc.perform(get("/api/decks").param("orgId", "org-9"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("d2"));

        verify(deckService).listForOrg(eq("org-9"), any());
    }

    @Test
    void listPublicReturnsPage() throws Exception {
        when(deckService.listPublic(any())).thenReturn(new PageImpl<>(List.of(deck("p1"))));

        mockMvc.perform(get("/api/decks/public").param("page", "0").param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value("p1"))
                .andExpect(jsonPath("$.page.totalElements").value(1));
    }

    // ── Fixtures ──────────────────────────────────────────────────────────────

    private static Deck deck(String id) {
        Deck deck = new Deck();
        deck.setId(id);
        deck.setPublicId("pub-" + id);
        deck.setName("My Deck");
        deck.setOwnership(new Ownership(OwnershipType.USER, "user-1"));
        return deck;
    }

    private static Slide slide(String id) {
        Slide slide = new Slide();
        slide.setId(id);
        slide.setTitle("Slide " + id);
        return slide;
    }

    private static Slide slideWithSettings(String id,
            Settings.PointSettings points, Settings.AnswerSettings answers) {
        Slide slide = slide(id);
        slide.setSettings(new Settings.SlideSettings(points, answers));
        return slide;
    }

    private static Settings.PointSettings pointSettings(int points) {
        return new Settings.PointSettings(points, 0, 0, 0, null, false);
    }

    private static Settings.AnswerSettings answerSettings(int countdownTime) {
        return new Settings.AnswerSettings(ResultsDisplayMode.ROUND_END, false, false, false, countdownTime, false, 1);
    }
}
