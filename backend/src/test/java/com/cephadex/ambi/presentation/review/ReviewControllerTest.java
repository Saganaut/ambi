package com.cephadex.ambi.presentation.review;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.presentation.commentThread.dto.AuthorResponse;
import com.cephadex.ambi.presentation.review.dto.DeckReviewResponse;
import com.cephadex.ambi.presentation.review.dto.DeckReviewSummaryResponse;
import com.cephadex.ambi.presentation.review.dto.RateDeckRequest;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Controller-plumbing tests (routing, status codes, DTO mapping) in isolation via
 * standalone {@code MockMvc}, mirroring {@code CommentThreadControllerTest}. The
 * permission and rating semantics live in {@link DeckReviewService} (mocked here),
 * so these assert only that each route delegates correctly and serializes the result.
 */
@ExtendWith(MockitoExtension.class)
class ReviewControllerTest {

    private static final String BASE = "/api/decks/deck-1/reviews";

    @Mock
    private DeckReviewService deckReviewService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AmbiPrincipal principal = new AmbiPrincipal(
                IdentityState.REGISTERED, "user-1", "pub-1", UserLevel.USER,
                AuthProvider.INTERNAL, null, null, "sid-1");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));

        ReviewController controller = new ReviewController(deckReviewService);
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

    @Test
    void listDeckReviewsReturnsPagedEnvelope() throws Exception {
        when(deckReviewService.listReviews(eq("deck-1"), any(), any()))
                .thenReturn(new PageImpl<>(List.of(review("r1")), PageRequest.of(0, 20), 1));

        mockMvc.perform(get(BASE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value("r1"))
                .andExpect(jsonPath("$.content[0].stars").value(4))
                .andExpect(jsonPath("$.page.totalElements").value(1));
    }

    @Test
    void getDeckReviewSummaryReturnsHeadline() throws Exception {
        when(deckReviewService.getSummary(eq("deck-1"), any()))
                .thenReturn(new DeckReviewSummaryResponse(4.5, 2L, new long[] {0, 0, 0, 1, 1}));

        mockMvc.perform(get(BASE + "/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.average").value(4.5))
                .andExpect(jsonPath("$.count").value(2))
                .andExpect(jsonPath("$.distribution[4]").value(1));
    }

    @Test
    void getMyReviewReturnsCallersReview() throws Exception {
        when(deckReviewService.getMyReview(eq("deck-1"), any())).thenReturn(review("mine"));

        mockMvc.perform(get(BASE + "/mine"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("mine"))
                .andExpect(jsonPath("$.mine").value(true));
    }

    @Test
    void rateDeckReturnsTheReview() throws Exception {
        when(deckReviewService.rateDeck(eq("deck-1"), any(RateDeckRequest.class), any()))
                .thenReturn(review("r1"));

        mockMvc.perform(put(BASE)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"stars\":4,\"body\":\"good\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("r1"))
                .andExpect(jsonPath("$.stars").value(4));
    }

    @Test
    void deleteMyReviewReturns204() throws Exception {
        mockMvc.perform(delete(BASE + "/mine"))
                .andExpect(status().isNoContent());

        verify(deckReviewService).deleteMyReview(eq("deck-1"), any());
    }

    private static DeckReviewResponse review(String id) {
        return new DeckReviewResponse(id, new AuthorResponse("pub-1", "Ann", null), 4, "good", true);
    }
}
