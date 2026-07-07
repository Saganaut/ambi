package com.cephadex.ambi.session;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.slide.enums.SlideType;
import com.cephadex.ambi.session.dto.SessionSnapshotResponse;
import com.cephadex.ambi.session.event.SessionEvents;
import com.cephadex.ambi.session.event.dto.ParticipantView;
import com.cephadex.ambi.session.event.dto.QAndAQuestionView;
import com.cephadex.ambi.session.event.dto.SlideView;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantRepository;
import com.cephadex.ambi.session.participant.ParticipantResolver;
import com.cephadex.ambi.session.redis.AnswerStore;
import com.cephadex.ambi.session.redis.LiveRoundState;
import com.cephadex.ambi.session.redis.LiveRoundStateStore;
import com.cephadex.ambi.session.redis.Presence;
import com.cephadex.ambi.session.redis.PresenceStore;
import com.cephadex.ambi.session.redis.QAndAHostAnswerStore;
import com.cephadex.ambi.session.redis.TallyStore;

/**
 * Assembles the read-model {@link SessionSnapshotResponse} behind {@code GET
 * /api/liveSessions/{id}}. Pure reads: it reconstructs the current session view
 * from the durable {@link LiveSession} aggregate plus the volatile Redis stores
 * (round state, tally, presence), reusing the same participant-safe DTO builders
 * ({@link ParticipantView}, {@link SlideView}, {@link SessionEvents#scoreboard})
 * the STOMP events use — so the snapshot a client seeds from and the deltas it
 * then applies describe the same shape.
 *
 * <p>Read-only, so unlike the command services it takes <strong>no session
 * lock</strong>: a snapshot is a best-effort view and a concurrent round
 * transition simply lands as the next event the client applies on top.
 */
@Service
public class LiveSessionSnapshotService {

    private final LiveSessionRepository sessions;
    private final ParticipantRepository participants;
    private final ParticipantResolver participantResolver;
    private final LiveRoundStateStore roundStateStore;
    private final TallyStore tallyStore;
    private final PresenceStore presenceStore;
    private final AnswerStore answerStore;
    private final QAndAHostAnswerStore qandaHostAnswers;

    public LiveSessionSnapshotService(LiveSessionRepository sessions, ParticipantRepository participants,
            ParticipantResolver participantResolver, LiveRoundStateStore roundStateStore, TallyStore tallyStore,
            PresenceStore presenceStore, AnswerStore answerStore, QAndAHostAnswerStore qandaHostAnswers) {
        this.sessions = sessions;
        this.participants = participants;
        this.participantResolver = participantResolver;
        this.roundStateStore = roundStateStore;
        this.tallyStore = tallyStore;
        this.presenceStore = presenceStore;
        this.answerStore = answerStore;
        this.qandaHostAnswers = qandaHostAnswers;
    }

    /**
     * The current snapshot of session {@code sessionId} for the calling participant.
     *
     * <p>Also carries the deck's static invite-display flags ({@code
     * showRoomCodeInHeader}, {@code showJoinInfoInResults}). These are fixed at
     * deck-authoring time and never change during a run, so they are seeded here
     * only — no {@code SessionEvent} delta ever patches them.
     *
     * @throws NotFoundException  if no session has that id
     * @throws com.cephadex.ambi.common.exception.ForbiddenException if the caller is
     *                            not a (non-banned) participant on the roster
     */
    public SessionSnapshotResponse getSnapshot(String sessionId, AmbiPrincipal principal) {
        LiveSession session = sessions.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("SESSION_NOT_FOUND", "session not found"));
        // Authorization: resolve throws if the caller isn't on the roster.
        Participant viewer = participantResolver.resolve(session, principal);

        LiveRoundState roundState = roundStateStore.load(sessionId).orElseGet(LiveRoundState::idle);
        Map<String, Presence> presence = presenceStore.all(sessionId);

        // Load the roster once, then re-order it back into join order (findAllById
        // does not preserve it) and build participant-safe views with live presence.
        Map<String, Participant> byId = participants.findAllById(session.getRoster()).stream()
                .collect(Collectors.toMap(p -> p.getParticipantId(), Function.identity()));
        List<Participant> roster = session.getRoster().stream()
                .map(byId::get)
                .filter(p -> p != null)
                .toList();
        List<ParticipantView> rosterViews = roster.stream()
                .map(p -> toView(p, presence))
                .toList();

        String currentSlideId = roundState.currentSlideId();
        SlideView currentSlide = null;
        Map<String, Integer> optionTally = null;
        List<QAndAQuestionView> qAndAQuestions = null;
        if (currentSlideId != null) {
            var slide = session.getDeck().findSlide(currentSlideId).orElse(null);
            if (slide != null) {
                Settings.AnswerSettings effective =
                        Settings.effectiveAnswerSettings(session.getDeck().getSettings(), slide.getSettings());
                currentSlide = SlideView.from(slide, effective);
                if (currentSlide.contentType() == SlideType.Q_AND_A) {
                    // Same participant-safe assembly the QAndAUpdated deltas use, so the
                    // seeded list and every patch agree (incl. the anonymize stripping).
                    boolean anonymize = effective != null && effective.anonymizeAnswers();
                    qAndAQuestions = QAndAQuestionView.from(
                            answerStore.answers(sessionId, currentSlideId),
                            qandaHostAnswers.all(sessionId, currentSlideId),
                            anonymize);
                }
            }
            optionTally = tallyStore.tally(sessionId, currentSlideId);
        }

        RoundPhase phase = roundState.phase() != null ? roundState.phase() : session.getPhase();

        Settings.InviteSettings invite = session.getDeck().getSettings() == null ? null
                : session.getDeck().getSettings().inviteSettings();
        boolean showRoomCodeInHeader = invite != null && invite.showRoomCodeInHeader();
        boolean showJoinInfoInResults = invite != null && invite.showJoinInfoInResults();

        return new SessionSnapshotResponse(
                session.getId(),
                session.getPublicId(),
                session.getRoomCode(),
                session.getStatus(),
                phase,
                currentSlideId,
                currentSlide,
                roundState.roundStartedAt(),
                optionTally,
                qAndAQuestions,
                rosterViews,
                SessionEvents.scoreboard(roster),
                viewer.getParticipantId(),
                session.isHost(viewer.getParticipantId()),
                showRoomCodeInHeader,
                showJoinInfoInResults);
    }

    /**
     * The participant's wire view with its connection status overridden by the live
     * Redis presence when present — the presence hash is bumped on every heartbeat,
     * so it is fresher than the status latched on the {@link Participant} document.
     */
    private ParticipantView toView(Participant p, Map<String, Presence> presence) {
        ParticipantView base = ParticipantView.from(p);
        Presence live = presence.get(p.getParticipantId());
        if (live == null) {
            return base;
        }
        return new ParticipantView(base.participantId(), base.displayName(), base.colorTag(),
                base.internalAvatarId(), live.status(), base.score());
    }
}
