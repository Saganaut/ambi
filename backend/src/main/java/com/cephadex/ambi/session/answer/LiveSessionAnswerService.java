package com.cephadex.ambi.session.answer;

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
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.QAndAContent;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.session.LiveSessionOrchestrator;
import com.cephadex.ambi.session.answer.dto.SubmitAnswerRequest;
import com.cephadex.ambi.session.answer.payload.AnswerPayload;
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

        orchestrator.submitAnswer(sessionId, request.slideId(), participant.getParticipantId(),
                request.payload(), maxSelections);
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
        // Other content types are stored as-is; their tally/validation lands with scoring.
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
