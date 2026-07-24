package com.cephadex.ambi.session.answer;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.common.validation.ValidationConstants;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.storage.ImageIngestService;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.deck.Settings.AnswerSettings;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.AxisContent;
import com.cephadex.ambi.presentation.slide.content.DrawingContent;
import com.cephadex.ambi.presentation.slide.content.GridContent;
import com.cephadex.ambi.presentation.slide.content.MatchingContent;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.PlaceOnImageContent;
import com.cephadex.ambi.presentation.slide.content.QAndAContent;
import com.cephadex.ambi.presentation.slide.content.ScalesContent;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.content.TextContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisPoint;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlacePoint;
import com.cephadex.ambi.session.LiveSessionOrchestrator;
import com.cephadex.ambi.session.answer.dto.SubmitAnswerRequest;
import com.cephadex.ambi.session.answer.dto.SubmitVoteRequest;
import com.cephadex.ambi.session.answer.payload.AnswerPayload;
import com.cephadex.ambi.session.answer.payload.AxisAnswer;
import com.cephadex.ambi.session.answer.payload.DrawingAnswer;
import com.cephadex.ambi.session.answer.payload.GridAnswer;
import com.cephadex.ambi.session.answer.payload.MatchingAnswer;
import com.cephadex.ambi.session.answer.payload.McqAnswer;
import com.cephadex.ambi.session.answer.payload.PlaceOnImageAnswer;
import com.cephadex.ambi.session.answer.payload.QAndAAnswer;
import com.cephadex.ambi.session.answer.payload.ScalesAnswer;
import com.cephadex.ambi.session.answer.payload.TextAnswer;
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

    /** Key namespace for participant drawing uploads: {@code drawing/{sessionId}/…}. */
    private static final String DRAWING_KEY_NAMESPACE = "drawing/";

    private final LiveSessionRepository sessions;
    private final ParticipantResolver participantResolver;
    private final LiveSessionOrchestrator orchestrator;
    private final ImageIngestService imageIngest;

    public LiveSessionAnswerService(LiveSessionRepository sessions, ParticipantResolver participantResolver,
            LiveSessionOrchestrator orchestrator, ImageIngestService imageIngest) {
        this.sessions = sessions;
        this.participantResolver = participantResolver;
        this.orchestrator = orchestrator;
        this.imageIngest = imageIngest;
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
        validatePayload(sessionId, participant.getParticipantId(), slide, request.payload(), maxSelections);

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
        // grid, axis, scales, matching, drawing, or text submission is one whole
        // artifact, so the deck default of 1 must not make the first submission
        // final — these resubmits overwrite (last write before close wins), like
        // a multi-select MCQ change.
        int effectiveMaxSelections = request.payload() instanceof GridAnswer
                || request.payload() instanceof AxisAnswer
                || request.payload() instanceof PlaceOnImageAnswer
                || request.payload() instanceof ScalesAnswer
                || request.payload() instanceof MatchingAnswer
                || request.payload() instanceof DrawingAnswer
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

    private void validatePayload(String sessionId, String participantId, Slide slide, AnswerPayload payload,
            int maxSelections) {
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
        if (content instanceof PlaceOnImageContent place && payload instanceof PlaceOnImageAnswer ans) {
            validatePlaceOnImage(place, ans);
        }
        if (content instanceof ScalesContent scales && payload instanceof ScalesAnswer ans) {
            validateScales(scales, ans);
        }
        if (content instanceof MatchingContent matching && payload instanceof MatchingAnswer ans) {
            validateMatching(matching, ans);
        }
        if (content instanceof DrawingContent && payload instanceof DrawingAnswer ans) {
            validateDrawing(sessionId, participantId, ans);
        }
        if (content instanceof TextContent text && payload instanceof TextAnswer ans) {
            validateText(text, ans);
        }
        // Other content types are stored as-is; their tally/validation lands with scoring.
    }

    /**
     * A drawing submission must reference an image the submitting participant
     * stored through this session's {@code storeDrawing} upload — internal, and
     * keyed under {@code drawing/{sessionId}/{participantId}/…}. That rules out
     * external URLs, gallery keys, other sessions' uploads, and other
     * participants' drawings (whose keys leak via the presigned gallery URLs at
     * results time) alike.
     */
    private void validateDrawing(String sessionId, String participantId, DrawingAnswer answer) {
        AppImage image = answer.image();
        if (image == null || image.isExternal() || image.getSrcKey() == null) {
            throw new ValidationException("a drawing answer must carry an uploaded drawing image");
        }
        if (!image.getSrcKey().startsWith(drawingPrefix(sessionId, participantId))) {
            throw new ValidationException("drawing image was not uploaded by this participant in this session");
        }
    }

    /**
     * A matching submission must connect at least one real pair: every key a left
     * card on the slide, every value a right card, and no right card claimed by
     * two connections (the physical-card model — a card can only sit in one
     * pairing). Partial maps are accepted (grid/axis precedent — the board gates
     * full completion client-side).
     */
    private void validateMatching(MatchingContent content, MatchingAnswer answer) {
        Map<String, String> matches = answer.matches();
        if (matches == null || matches.isEmpty()) {
            throw new ValidationException("at least one pair must be matched");
        }
        Set<String> leftIds = cardIds(content.left());
        Set<String> rightIds = cardIds(content.right());
        Set<String> claimed = new HashSet<>();
        for (Map.Entry<String, String> match : matches.entrySet()) {
            if (!leftIds.contains(match.getKey()) || !rightIds.contains(match.getValue())) {
                throw new ValidationException("matched card is not on the slide");
            }
            if (!claimed.add(match.getValue())) {
                throw new ValidationException("a card may only be matched once");
            }
        }
    }

    private static Set<String> cardIds(List<MatchItem> items) {
        return items == null ? Set.of()
                : items.stream()
                        .map(item -> item.id())
                        .collect(Collectors.toSet());
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

    /**
     * A place-on-image submission must pin at least one real item at a real
     * point: every key must be one of the slide's targets (the items to place),
     * every point finite and within the normalized {@code [0, 1]} image box.
     * Partial maps are accepted (grid/axis precedent — the board gates full
     * completion client-side).
     */
    private void validatePlaceOnImage(PlaceOnImageContent content, PlaceOnImageAnswer answer) {
        Map<String, PlacePoint> placements = answer.placements();
        if (placements == null || placements.isEmpty()) {
            throw new ValidationException("at least one item must be placed");
        }
        Set<String> itemIds = content.correctTargets() == null ? Set.of()
                : content.correctTargets().stream()
                        .map(target -> target.id())
                        .collect(Collectors.toSet());
        for (Map.Entry<String, PlacePoint> placement : placements.entrySet()) {
            if (!itemIds.contains(placement.getKey())) {
                throw new ValidationException("placed item is not on the slide");
            }
            PlacePoint point = placement.getValue();
            if (point == null || !Double.isFinite(point.x()) || !Double.isFinite(point.y())
                    || point.x() < 0 || point.x() > 1 || point.y() < 0 || point.y() > 1) {
                throw new ValidationException("placement is not on the image");
            }
        }
    }

    /**
     * A scales submission must rate at least one real statement: every key must
     * be an item on the slide, every value a finite normalized position within
     * {@code [0, 1]}. Partial maps are accepted (grid/axis precedent — the board
     * gates full completion client-side).
     */
    private void validateScales(ScalesContent content, ScalesAnswer answer) {
        Map<String, Double> positions = answer.positions();
        if (positions == null || positions.isEmpty()) {
            throw new ValidationException("at least one statement must be rated");
        }
        Set<String> itemIds = content.items() == null ? Set.of()
                : content.items().stream()
                        .map(item -> item.id())
                        .collect(Collectors.toSet());
        for (Map.Entry<String, Double> rating : positions.entrySet()) {
            if (!itemIds.contains(rating.getKey())) {
                throw new ValidationException("rated statement is not on the slide");
            }
            Double position = rating.getValue();
            if (position == null || !Double.isFinite(position)
                    || position < 0 || position > 1) {
                throw new ValidationException("rating is not on the scale");
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

    /**
     * A text submission (short-answer or word-cloud) must be non-blank, within
     * the global {@link ValidationConstants#TEXT_ANSWER_MAX} cap (re-checked
     * defensively behind the {@code @Size} annotation on {@link TextAnswer}),
     * and within the slide's own {@code maxLength} when the author set one. The
     * length is measured on the raw submitted string — the same characters the
     * client counted against the cap.
     */
    private void validateText(TextContent content, TextAnswer answer) {
        String text = answer.text();
        if (text == null || text.isBlank()) {
            throw new ValidationException("a text answer must not be empty");
        }
        if (text.length() > ValidationConstants.TEXT_ANSWER_MAX) {
            throw new ValidationException("text answer is too long");
        }
        Integer maxLength = content.maxLength();
        if (maxLength != null && text.length() > maxLength) {
            throw new ValidationException("text answer exceeds the slide's character limit");
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
