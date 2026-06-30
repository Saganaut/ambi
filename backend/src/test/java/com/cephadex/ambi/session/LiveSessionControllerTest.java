package com.cephadex.ambi.session;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.session.answer.LiveSessionAnswerService;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Controller-plumbing tests (routing, status, validation, principal binding) in
 * isolation via standalone {@code MockMvc}, mirroring {@code DeckControllerTest}.
 * The service is mocked, so these assert only that the route delegates and that
 * bean-validation on the body is enforced.
 */
@ExtendWith(MockitoExtension.class)
class LiveSessionControllerTest {

    @Mock
    private LiveSessionLobbyService lobbyService;

    @Mock
    private LiveSessionAnswerService answerService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AmbiPrincipal principal = new AmbiPrincipal(
                IdentityState.GUEST, "user-1", "pub-1", UserLevel.GUEST,
                AuthProvider.INTERNAL, null, null, "sid-1");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));

        LiveSessionController controller = new LiveSessionController(lobbyService, answerService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void submitDelegatesAndReturns202() throws Exception {
        mockMvc.perform(post("/api/liveSessions/sess-1/answers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slideId\":\"slide-1\",\"payload\":{\"answerType\":\"McqAnswer\",\"optionIds\":[\"opt-a\"]}}"))
                .andExpect(status().isAccepted());

        verify(answerService).submit(eq("sess-1"), any(), any());
    }

    @Test
    void blankSlideIdIsRejected() throws Exception {
        mockMvc.perform(post("/api/liveSessions/sess-1/answers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slideId\":\"\",\"payload\":{\"answerType\":\"McqAnswer\",\"optionIds\":[\"opt-a\"]}}"))
                .andExpect(status().isBadRequest());

        verify(answerService, never()).submit(any(), any(), any());
    }

    @Test
    void createDelegatesAndReturns201() throws Exception {
        mockMvc.perform(post("/api/liveSessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"deckId\":\"deck-1\"}"))
                .andExpect(status().isCreated());

        verify(lobbyService).createSession(any(), any());
    }

    @Test
    void createWithBlankDeckIdIsRejected() throws Exception {
        mockMvc.perform(post("/api/liveSessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"deckId\":\"\"}"))
                .andExpect(status().isBadRequest());

        verify(lobbyService, never()).createSession(any(), any());
    }

    @Test
    void joinDelegatesAndReturns200() throws Exception {
        mockMvc.perform(post("/api/liveSessions/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roomCode\":\"ABCDEFGH\",\"displayName\":\"Player\"}"))
                .andExpect(status().isOk());

        verify(lobbyService).join(any(), any());
    }

    @Test
    void startDelegatesAndReturns202() throws Exception {
        mockMvc.perform(post("/api/liveSessions/sess-1/start"))
                .andExpect(status().isAccepted());

        verify(lobbyService).start(eq("sess-1"), any());
    }

    @Test
    void leaveDelegatesAndReturns204() throws Exception {
        mockMvc.perform(post("/api/liveSessions/sess-1/leave"))
                .andExpect(status().isNoContent());

        verify(lobbyService).leave(eq("sess-1"), any());
    }
}
