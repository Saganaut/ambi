package com.cephadex.ambi.presentation.commentThread;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.presentation.commentThread.dto.AuthorResponse;
import com.cephadex.ambi.presentation.commentThread.dto.CommentBodyRequest;
import com.cephadex.ambi.presentation.commentThread.dto.CommentResponse;
import com.cephadex.ambi.presentation.commentThread.dto.CommentThreadResponse;
import com.cephadex.ambi.presentation.commentThread.dto.SetThreadStatusRequest;
import com.cephadex.ambi.presentation.commentThread.enums.CommentThreadStatus;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Controller-plumbing tests (routing, status codes, DTO mapping) in isolation
 * via standalone {@code MockMvc}, mirroring {@code DeckControllerTest}. The
 * permission and thread semantics live in {@link CommentThreadService} (mocked
 * here), so these assert only that each route delegates correctly and serializes
 * the result.
 */
@ExtendWith(MockitoExtension.class)
class CommentThreadControllerTest {

    private static final String BASE = "/api/decks/deck-1/slides/slide-1/comment-threads";

    @Mock
    private CommentThreadService commentThreadService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AmbiPrincipal principal = new AmbiPrincipal(
                IdentityState.REGISTERED, "user-1", "pub-1", UserLevel.USER,
                AuthProvider.INTERNAL, null, null, "sid-1");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));

        CommentThreadController controller = new CommentThreadController(commentThreadService);
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
    void listSlideCommentThreadsReturnsPagedEnvelope() throws Exception {
        when(commentThreadService.listSlideThreads(eq("deck-1"), eq("slide-1"), any(), any()))
                .thenReturn(new PageImpl<>(List.of(thread("t1", CommentThreadStatus.OPEN)),
                        PageRequest.of(0, 20), 1));

        mockMvc.perform(get(BASE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value("t1"))
                .andExpect(jsonPath("$.content[0].comments[0].id").value("c1"))
                .andExpect(jsonPath("$.page.totalElements").value(1));
    }

    @Test
    void createCommentThreadReturns201() throws Exception {
        when(commentThreadService.createThread(eq("deck-1"), eq("slide-1"),
                any(CommentBodyRequest.class), any()))
                .thenReturn(thread("new-t", CommentThreadStatus.OPEN));

        mockMvc.perform(post(BASE)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"body\":\"Opening\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("new-t"));
    }

    @Test
    void addThreadCommentReturns201() throws Exception {
        when(commentThreadService.addComment(eq("deck-1"), eq("slide-1"), eq("t1"),
                any(CommentBodyRequest.class), any()))
                .thenReturn(thread("t1", CommentThreadStatus.OPEN));

        mockMvc.perform(post(BASE + "/t1/comments")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"body\":\"A reply\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("t1"));
    }

    @Test
    void updateThreadCommentReturns200() throws Exception {
        when(commentThreadService.editComment(eq("deck-1"), eq("slide-1"), eq("t1"), eq("c1"),
                any(CommentBodyRequest.class), any()))
                .thenReturn(thread("t1", CommentThreadStatus.OPEN));

        mockMvc.perform(patch(BASE + "/t1/comments/c1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"body\":\"Edited\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comments[0].id").value("c1"));
    }

    @Test
    void deleteThreadCommentReturns200() throws Exception {
        when(commentThreadService.deleteComment(eq("deck-1"), eq("slide-1"), eq("t1"), eq("c1"), any()))
                .thenReturn(thread("t1", CommentThreadStatus.OPEN));

        mockMvc.perform(delete(BASE + "/t1/comments/c1"))
                .andExpect(status().isOk());

        verify(commentThreadService).deleteComment(eq("deck-1"), eq("slide-1"), eq("t1"), eq("c1"), any());
    }

    @Test
    void setThreadStatusReturns200() throws Exception {
        when(commentThreadService.setStatus(eq("deck-1"), eq("slide-1"), eq("t1"),
                any(SetThreadStatusRequest.class), any()))
                .thenReturn(thread("t1", CommentThreadStatus.RESOLVED));

        mockMvc.perform(patch(BASE + "/t1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"RESOLVED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));
    }

    private static CommentThreadResponse thread(String id, CommentThreadStatus status) {
        CommentResponse comment = new CommentResponse("c1",
                new AuthorResponse("pub-1", "Ann", null), "body", false, false);
        return new CommentThreadResponse(id, "slide-1", status, List.of(comment));
    }
}
