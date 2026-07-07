package com.cephadex.ambi.session.answer;

import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.common.validation.ValidationConstants;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.deck.Settings.AnswerSettings;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.AxisContent;
import com.cephadex.ambi.presentation.slide.content.GridContent;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.QAndAContent;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisPoint;
import com.cephadex.ambi.session.LiveSessionOrchestrator;
import com.cephadex.ambi.session.answer.dto.SubmitAnswerRequest;
import com.cephadex.ambi.session.answer.payload.AnswerPayload;
import com.cephadex.ambi.session.answer.payload.AxisAnswer;
import com.cephadex.ambi.session.answer.payload.GridAnswer;
import com.cephadex.ambi.session.answer.payload.McqAnswer;
import com.cephadex.ambi.session.answer.payload.QAndAAnswer;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantResolver;

/**
 * Application service behind {@code POST /api/liveSessions/{id}/answers}: turns an
 * authenticated request into a vetted call on {@link LiveSessionOrchestrator}. It
 * owns the Mongo-side work — loading the session, resolving the caller to a roster
 * {@link Participant}, and validating the payload against the slide's content and
 * answer settings — so the orchestrator's submit path stays a lock-free, Redis-only
 * write that only needs the resolved {@code participantId} and {@code maxSelections}.
 */
@Service
public class LiveSessionAnswerService {

    private final LiveSessionRepository sessions;
    private final ParticipantResolver participantResolver;
    private final LiveSessionOrchestrator orchestrator;

    public LiveSessionAnswerService(LiveSessionRepository sessions, ParticipantResolver participantResolver,
            LiveSessionOrchestrator orchestrator) {
        this.sessions = sessions;
        this.participantResolver = participantResolver;
        this.orchestrator = orchestrator;
    }

    /**
     * Validates and records {@code request} as {@code principal}'s answer for the
     * open round on {@code sessionId}, delegating the Redis write to the orchestrator.
     *
     * @throws NotFoundException   if the session or slide doesn't exist
     * @throws ConflictException   if the session isn't in progress (or the round is
     *                             closed — surfaced by the orchestrator)
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
        validatePayload(slide, request.payload(), maxSelections);

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
        // grid or axis submission is one whole placement map, so the deck default
        // of 1 must not make the first submission final — placement resubmits
        // overwrite (last write before close wins), like a multi-select MCQ change.
        int effectiveMaxSelections = request.payload() instanceof GridAnswer
                || request.payload() instanceof AxisAnswer ? 0 : maxSelections;
        orchestrator.submitAnswer(sessionId, request.slideId(), participant.getParticipantId(),
                request.payload(), effectiveMaxSelections);
    }

    private void validatePayload(Slide slide, AnswerPayload payload, int maxSelections) {
        SlideContent content = slide.getContent();
        if (content == null || payload.slideType() != content.contentType()) {
            throw new ValidationException("answer type does not match the slide");
        }
        if (content instanceof McqContent mcq && payload instanceof McqAnswer ans) {
            validateMcq(mcq, ans, maxSelections);
        }
        if (content instanceof QAndAContent) {
            validateQAndA(payload);
        }
        if (content instanceof GridContent grid && payload instanceof GridAnswer ans) {
            validateGrid(grid, ans);
        }
        if (content instanceof AxisContent axis && payload instanceof AxisAnswer ans) {
            validateAxis(axis, ans);
        }
        // Other content types are stored as-is; their tally/validation lands with scoring.
    }

    /**
     * A grid submission must place at least one real item on a real cell: every
     * key must be an item on the slide, every value a well-formed
     * {@code "rowIndex,colIndex"} within the matrix bounds.
     */
    private void validateGrid(GridContent content, GridAnswer answer) {
        Map<String, String> placements = answer.placements();
        if (placements == null || placements.isEmpty()) {
            throw new ValidationException("at least one item must be placed");
        }
        Set<String> itemIds = content.items() == null ? Set.of()
                : content.items().stream()
                        .map(item -> item.id())
                        .collect(Collectors.toSet());
        int rows = content.rowLabels() == null ? 0 : content.rowLabels().size();
        int cols = content.colLabels() == null ? 0 : content.colLabels().size();
        for (Map.Entry<String, String> placement : placements.entrySet()) {
            if (!itemIds.contains(placement.getKey())) {
                throw new ValidationException("placed item is not on the slide");
            }
            if (!isCellWithin(placement.getValue(), rows, cols)) {
                throw new ValidationException("placement cell is not on the grid");
            }
        }
    }

    /**
     * An axis submission must place at least one real item at a real point: every
     * key must be an item on the slide, every point finite and within the
     * normalized {@code [0, 1]} plane on both axes.
     */
    private void validateAxis(AxisContent content, AxisAnswer answer) {
        Map<String, AxisPoint> placements = answer.placements();
        if (placements == null || placements.isEmpty()) {
            throw new ValidationException("at least one item must be placed");
        }
        Set<String> itemIds = content.items() == null ? Set.of()
                : content.items().stream()
                        .map(item -> item.id())
                        .collect(Collectors.toSet());
        for (Map.Entry<String, AxisPoint> placement : placements.entrySet()) {
            if (!itemIds.contains(placement.getKey())) {
                throw new ValidationException("placed item is not on the slide");
            }
            if (!isPointOnPlane(placement.getValue())) {
                throw new ValidationException("placement is not on the plane");
            }
        }
    }

    /** Whether {@code point} is finite and within the normalized [0, 1] plane. */
    private static boolean isPointOnPlane(AxisPoint point) {
        return point != null
                && Double.isFinite(point.x()) && Double.isFinite(point.y())
                && point.x() >= 0 && point.x() <= 1
                && point.y() >= 0 && point.y() <= 1;
    }

    /** Whether {@code cell} is a well-formed {@code "rowIndex,colIndex"} inside the matrix. */
    private static boolean isCellWithin(String cell, int rows, int cols) {
        if (cell == null) {
            return false;
        }
        String[] parts = cell.split(",", -1);
        if (parts.length != 2) {
            return false;
        }
        try {
            int row = Integer.parseInt(parts[0]);
            int col = Integer.parseInt(parts[1]);
            return row >= 0 && row < rows && col >= 0 && col < cols;
        } catch (NumberFormatException malformed) {
            return false;
        }
    }

    /**
     * A Q&amp;A submission must be the wire shape ({@link QAndAAnswer} — the stored
     * {@code QAndAQuestions} aggregate is server-built and never accepted from a
     * client) with a non-blank question within the length cap.
     */
    private void validateQAndA(AnswerPayload payload) {
        if (!(payload instanceof QAndAAnswer question)) {
            throw new ValidationException("answer type does not match the slide");
        }
        if (question.question() == null || question.question().isBlank()) {
            throw new ValidationException("a question must not be empty");
        }
        if (question.question().length() > ValidationConstants.QANDA_QUESTION_MAX) {
            throw new ValidationException("question is too long");
        }
    }

    private void validateMcq(McqContent content, McqAnswer answer, int maxSelections) {
        Set<String> optionIds = answer.optionIds();
        if (optionIds == null || optionIds.isEmpty()) {
            throw new ValidationException("at least one option must be selected");
        }
        Set<String> valid = content.options().stream()
                .map(o -> o.id())
                .collect(Collectors.toSet());
        if (!valid.containsAll(optionIds)) {
            throw new ValidationException("selected option is not on the slide");
        }
        if (maxSelections == 1 && optionIds.size() != 1) {
            throw new ValidationException("only one option may be selected");
        }
        if (maxSelections > 1 && optionIds.size() > maxSelections) {
            throw new ValidationException("too many options selected");
        }
    }
}
