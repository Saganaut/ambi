package com.cephadex.ambi.session.answer;

import java.util.UUID;

import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.storage.ImageIngestService;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.deck.Settings.AnswerSettings;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.QAndAContent;
import com.cephadex.ambi.session.LiveSessionOrchestrator;
import com.cephadex.ambi.session.answer.dto.SubmitAnswerRequest;
import com.cephadex.ambi.session.answer.dto.SubmitVoteRequest;
import com.cephadex.ambi.session.answer.payload.AllocationAnswer;
import com.cephadex.ambi.session.answer.payload.AxisAnswer;
import com.cephadex.ambi.session.answer.payload.DrawingAnswer;
import com.cephadex.ambi.session.answer.payload.FollowUpAnswer;
import com.cephadex.ambi.session.answer.payload.GridAnswer;
import com.cephadex.ambi.session.answer.payload.MatchingAnswer;
import com.cephadex.ambi.session.answer.payload.PlaceOnImageAnswer;
import com.cephadex.ambi.session.answer.payload.QAndAAnswer;
import com.cephadex.ambi.session.answer.payload.ScalesAnswer;
import com.cephadex.ambi.session.answer.payload.TextAnswer;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantResolver;
import com.cephadex.ambi.session.redis.FollowUpOptionStore;

/**
 * Application service behind {@code POST /api/liveSessions/{id}/answers}: turns an
 * authenticated request into a vetted call on {@link LiveSessionOrchestrator}. It
 * owns the Mongo-side work — loading the session, resolving the caller to a roster
 * {@link Participant}, and coordinating payload validation against the slide's content
 * and answer settings — so the orchestrator's submit path stays a lock-free, Redis-only
 * write that only needs the resolved {@code participantId} and {@code maxSelections}.
 *
 * <p>A follow-up round is the one exception to "validate against the slide": its
 * board is minted at runtime, so the pick is checked against the
 * {@link FollowUpOptionStore} snapshot instead of any authored content.
 */
@Service
public class LiveSessionAnswerService {

    /** Key namespace for participant drawing uploads: {@code drawing/{sessionId}/…}. */
    private static final String DRAWING_KEY_NAMESPACE = "drawing/";

    private final LiveSessionRepository sessions;
    private final ParticipantResolver participantResolver;
    private final LiveSessionOrchestrator orchestrator;
    private final ImageIngestService imageIngest;
    private final AnswerPayloadValidator payloadValidator;

    public LiveSessionAnswerService(LiveSessionRepository sessions, ParticipantResolver participantResolver,
            LiveSessionOrchestrator orchestrator, ImageIngestService imageIngest,
            AnswerPayloadValidator payloadValidator) {
        this.sessions = sessions;
        this.participantResolver = participantResolver;
        this.orchestrator = orchestrator;
        this.imageIngest = imageIngest;
        this.payloadValidator = payloadValidator;
    }

    /**
     * Ingests a participant's rendered drawing (PNG bytes) into S3 under the
     * caller's {@code drawing/{sessionId}/{participantId}/…} namespace and
     * returns the stored {@link AppImage} for the client to echo back inside a
     * {@link DrawingAnswer}. The namespace is what {@code validateDrawing}
     * later checks, so an answer can only reference an image the same
     * participant uploaded through this same session — presigned gallery URLs
     * revealed at results time leak other players' keys, and those must not be
     * submittable as one's own drawing in a later round.
     *
     * @throws NotFoundException   if the session doesn't exist
     * @throws ConflictException   if the session isn't in progress
     * @throws ForbiddenException  if the caller isn't a (non-banned) roster participant
     * @throws ValidationException if the upload is empty/oversized/not an image
     */
    public AppImage storeDrawing(String sessionId, byte[] bytes, String contentType, AmbiPrincipal principal) {
        LiveSession session = sessions.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("SESSION_NOT_FOUND", "session not found"));
        if (!session.isLive()) {
            throw new ConflictException("SESSION_NOT_LIVE", "session is not in progress");
        }
        Participant participant = participantResolver.resolve(session, principal);
        String prefix = drawingPrefix(sessionId, participant.getParticipantId()) + UUID.randomUUID();
        return imageIngest.ingest(bytes, contentType, null, prefix);
    }

    /** The key prefix all of one participant's drawing uploads share in a session. */
    private static String drawingPrefix(String sessionId, String participantId) {
        return DRAWING_KEY_NAMESPACE + sessionId + "/" + participantId + "/";
    }

    /**
     * Validates and records {@code request} as {@code principal}'s answer for the
     * open round on {@code sessionId}, delegating the Redis write to the orchestrator.
     *
     * @throws NotFoundException   if the session or slide doesn't exist
     * @throws ConflictException   if the session isn't in progress (or the round is
     *                             closed — surfaced by the orchestrator), or a
     *                             follow-up pick targets the caller's own candidate
     * @throws ForbiddenException  if the caller isn't a (non-banned) roster
     *                             participant, or the slide bars guest answers
     * @throws ValidationException if the payload doesn't fit the slide
     */
    public void submit(String sessionId, SubmitAnswerRequest request, AmbiPrincipal principal) {
        LiveSession session = sessions.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("SESSION_NOT_FOUND", "session not found"));
        if (!session.isLive()) {
            throw new ConflictException("SESSION_NOT_LIVE", "session is not in progress");
        }

        Participant participant = participantResolver.resolve(session, principal);

        Slide slide = session.getDeck().findSlide(request.slideId())
                .orElseThrow(() -> new NotFoundException("SLIDE_NOT_FOUND", "slide not in deck snapshot"));
        AnswerSettings answer = Settings.effectiveAnswerSettings(
                session.getDeck().getSettings(), slide.getSettings());
        int maxSelections = answer == null ? 0 : answer.maxSelections();

        if (answer != null && !answer.allowAnonymous() && principal.state() == IdentityState.GUEST) {
            throw new ForbiddenException("ANONYMOUS_NOT_ALLOWED", "this slide does not accept guest answers");
        }
        payloadValidator.validate(sessionId, participant.getParticipantId(), slide, request.payload(), maxSelections);

        // Q&A departs from the single-answer model: questions append server-side
        // (per-participant cap from the content, not maxSelections), so it takes
        // the dedicated orchestrator path.
        if (request.payload() instanceof QAndAAnswer question) {
            QAndAContent qanda = (QAndAContent) slide.getContent();
            boolean anonymize = answer != null && answer.anonymizeAnswers();
            orchestrator.submitQuestion(sessionId, request.slideId(), participant.getParticipantId(),
                    question, qanda.maxResponses(), anonymize);
            return;
        }

        // `maxSelections` is an MCQ knob (how many options one pick may span). A
        // grid, axis, scales, matching, allocation, drawing, or text submission is
        // one whole artifact, so the deck default of 1 must not make the first
        // submission final — these resubmits overwrite (last write before close
        // wins), like a multi-select MCQ change. A follow-up pick joins them for
        // the same reason: it is a vote, re-castable until the round closes, so
        // the deck default must not freeze the first pick.
        int effectiveMaxSelections = request.payload() instanceof GridAnswer
                || request.payload() instanceof AxisAnswer
                || request.payload() instanceof PlaceOnImageAnswer
                || request.payload() instanceof ScalesAnswer
                || request.payload() instanceof MatchingAnswer
                || request.payload() instanceof AllocationAnswer
                || request.payload() instanceof DrawingAnswer
                || request.payload() instanceof FollowUpAnswer
                || request.payload() instanceof TextAnswer ? 0 : maxSelections;
        orchestrator.submitAnswer(sessionId, request.slideId(), participant.getParticipantId(),
                request.payload(), effectiveMaxSelections);
    }

    /**
     * Records {@code principal}'s best-answer vote for the voting round on
     * {@code sessionId} (D3), delegating the Redis write to the orchestrator. The
     * option id is opaque — self-vote and existence checks resolve against the
     * server-side option mapping in the orchestrator, so there is nothing to
     * validate against the slide here.
     *
     * @throws NotFoundException  if the session doesn't exist, or the option isn't
     *                            one of the round's (surfaced by the orchestrator)
     * @throws ConflictException  if the session isn't in progress, voting isn't
     *                            open, or the vote targets the caller's own answer
     * @throws ForbiddenException if the caller isn't a (non-banned) roster
     *                            participant
     */
    public void submitVote(String sessionId, SubmitVoteRequest request, AmbiPrincipal principal) {
        LiveSession session = sessions.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("SESSION_NOT_FOUND", "session not found"));
        if (!session.isLive()) {
            throw new ConflictException("SESSION_NOT_LIVE", "session is not in progress");
        }
        Participant participant = participantResolver.resolve(session, principal);
        orchestrator.submitVote(sessionId, request.slideId(), participant.getParticipantId(),
                request.optionId());
    }
}
