package com.cephadex.ambi.presentation.deck;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.presentation.deck.enums.DeckAclRole;
import com.cephadex.ambi.presentation.deck.enums.DeckVisibility;
import com.cephadex.ambi.presentation.deck.enums.OwnershipType;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.McqContent;
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
    void updateCarriesExistingSlidesThrough() throws Exception {
        Deck existing = deck("deck-1");
        existing.setSlides(new ArrayList<>(List.of(slide("s1"), slide("s2"))));
        when(deckService.getEditable(eq("deck-1"), any())).thenReturn(existing);

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
        assertThat(changes.getValue().getSlides())
                .extracting(Slide::getId)
                .containsExactly("s1", "s2");
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
                  "slideType": "MCQ",
                  "content": {
                    "contentType": "MCQ",
                    "options": [{"id": "o1", "text": "Frodo"}],
                    "correctOptionIds": ["o1"],
                    "maxSelections": 1
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
    void moveDelegatesToServiceAndReturnsDeck() throws Exception {
        when(deckService.moveSlide(eq("deck-1"), eq("s1"), eq(2), any()))
                .thenReturn(deck("deck-1"));

        mockMvc.perform(patch("/api/decks/deck-1/slides/s1/move")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"to\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("deck-1"))
                .andExpect(jsonPath("$.slides").doesNotExist());

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
        deck.setOwnership(new DeckOwnership(OwnershipType.USER, "user-1"));
        return deck;
    }

    private static Slide slide(String id) {
        Slide slide = new Slide();
        slide.setId(id);
        slide.setTitle("Slide " + id);
        return slide;
    }
}
