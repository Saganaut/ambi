package com.cephadex.ambi.session;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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
import com.cephadex.ambi.session.dto.AdvanceResponse;
import com.cephadex.ambi.session.dto.SessionSnapshotResponse;
import com.cephadex.ambi.session.liveSession.enums.LiveSessionLifecycle;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;
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

    @Mock
    private LiveSessionHostService hostService;

    @Mock
    private LiveSessionPresenceService presenceService;

    @Mock
    private LiveSessionSnapshotService snapshotService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AmbiPrincipal principal = new AmbiPrincipal(
                IdentityState.GUEST, "user-1", "pub-1", UserLevel.GUEST,
                AuthProvider.INTERNAL, null, null, "sid-1");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));

        LiveSessionController controller =
                new LiveSessionController(lobbyService, answerService, hostService, presenceService, snapshotService);
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
    void snapshotDelegatesAndReturns200() throws Exception {
        when(snapshotService.getSnapshot(eq("sess-1"), any()))
                .thenReturn(new SessionSnapshotResponse("sess-1", "pub-1",
                        LiveSessionLifecycle.LOBBY, RoundPhase.SUBMIT, null, null, null, null,
                        List.of(), List.of(), "part-1", true));

        mockMvc.perform(get("/api/liveSessions/sess-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").value("sess-1"))
                .andExpect(jsonPath("$.publicId").value("pub-1"))
                .andExpect(jsonPath("$.viewerIsHost").value(true));

        verify(snapshotService).getSnapshot(eq("sess-1"), any());
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

    // ── Host round & navigation control ──────────────────────────────────────

    @Test
    void advanceDelegatesAndReturnsOpenedSlide() throws Exception {
        when(hostService.advance(eq("sess-1"), any())).thenReturn(AdvanceResponse.opened("slide-9"));

        mockMvc.perform(post("/api/liveSessions/sess-1/advance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slideId").value("slide-9"))
                .andExpect(jsonPath("$.terminal").value(false));
    }

    @Test
    void goToRoundDelegatesAndReturns202() throws Exception {
        mockMvc.perform(post("/api/liveSessions/sess-1/rounds/slide-2"))
                .andExpect(status().isAccepted());

        verify(hostService).goTo(eq("sess-1"), eq("slide-2"), any());
    }

    @Test
    void closeRoundDelegatesAndReturns202() throws Exception {
        mockMvc.perform(post("/api/liveSessions/sess-1/rounds/slide-2/close"))
                .andExpect(status().isAccepted());

        verify(hostService).closeSubmissions(eq("sess-1"), eq("slide-2"), any());
    }

    @Test
    void revealResultsDelegatesAndReturns202() throws Exception {
        mockMvc.perform(post("/api/liveSessions/sess-1/rounds/slide-2/reveal-results"))
                .andExpect(status().isAccepted());

        verify(hostService).revealResults(eq("sess-1"), eq("slide-2"), any());
    }

    @Test
    void restartRoundDelegatesAndReturns202() throws Exception {
        mockMvc.perform(post("/api/liveSessions/sess-1/rounds/slide-2/restart"))
                .andExpect(status().isAccepted());

        verify(hostService).restartRound(eq("sess-1"), eq("slide-2"), any());
    }

    // ── Presence ─────────────────────────────────────────────────────────────

    @Test
    void reconnectDelegatesAndReturns202() throws Exception {
        mockMvc.perform(post("/api/liveSessions/sess-1/reconnect"))
                .andExpect(status().isAccepted());

        verify(presenceService).reconnect(eq("sess-1"), any());
    }

    @Test
    void heartbeatDelegatesAndReturns204() throws Exception {
        mockMvc.perform(post("/api/liveSessions/sess-1/heartbeat"))
                .andExpect(status().isNoContent());

        verify(presenceService).heartbeat(eq("sess-1"), any());
    }
}
