package com.cephadex.ambi.session.answer;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.common.validation.ValidationConstants;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.AllocationContent;
import com.cephadex.ambi.presentation.slide.content.AxisContent;
import com.cephadex.ambi.presentation.slide.content.DrawingContent;
import com.cephadex.ambi.presentation.slide.content.FollowUpContent;
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
import com.cephadex.ambi.session.answer.payload.AllocationAnswer;
import com.cephadex.ambi.session.answer.payload.AnswerPayload;
import com.cephadex.ambi.session.answer.payload.AxisAnswer;
import com.cephadex.ambi.session.answer.payload.DrawingAnswer;
import com.cephadex.ambi.session.answer.payload.FollowUpAnswer;
import com.cephadex.ambi.session.answer.payload.GridAnswer;
import com.cephadex.ambi.session.answer.payload.MatchingAnswer;
import com.cephadex.ambi.session.answer.payload.McqAnswer;
import com.cephadex.ambi.session.answer.payload.PlaceOnImageAnswer;
import com.cephadex.ambi.session.answer.payload.QAndAAnswer;
import com.cephadex.ambi.session.answer.payload.ScalesAnswer;
import com.cephadex.ambi.session.answer.payload.TextAnswer;
import com.cephadex.ambi.session.followUp.FollowUpOption;
import com.cephadex.ambi.session.redis.FollowUpOptionStore;

/** Enforces authored-slide and live follow-up-board invariants for participant answer payloads. */
@Service
public class AnswerPayloadValidator {

    private static final String DRAWING_KEY_NAMESPACE = "drawing/";

    private final FollowUpOptionStore followUpOptions;

    public AnswerPayloadValidator(FollowUpOptionStore followUpOptions) {
        this.followUpOptions = followUpOptions;
    }

    public void validate(String sessionId, String participantId, Slide slide, AnswerPayload payload,
            int maxSelections) {
        SlideContent content = slide.getContent();
        if (content == null || payload.slideType() != content.contentType()) {
            throw new ValidationException("answer type does not match the slide");
        }
        if (content instanceof McqContent mcq && payload instanceof McqAnswer answer) {
            validateMcq(mcq, answer, maxSelections);
        } else if (content instanceof QAndAContent) {
            validateQAndA(payload);
        } else if (content instanceof GridContent grid && payload instanceof GridAnswer answer) {
            validateGrid(grid, answer);
        } else if (content instanceof AxisContent axis && payload instanceof AxisAnswer answer) {
            validateAxis(axis, answer);
        } else if (content instanceof PlaceOnImageContent place && payload instanceof PlaceOnImageAnswer answer) {
            validatePlaceOnImage(place, answer);
        } else if (content instanceof ScalesContent scales && payload instanceof ScalesAnswer answer) {
            validateScales(scales, answer);
        } else if (content instanceof MatchingContent matching && payload instanceof MatchingAnswer answer) {
            validateMatching(matching, answer);
        } else if (content instanceof AllocationContent allocation && payload instanceof AllocationAnswer answer) {
            validateAllocation(allocation, answer);
        } else if (content instanceof DrawingContent && payload instanceof DrawingAnswer answer) {
            validateDrawing(sessionId, participantId, answer);
        } else if (content instanceof TextContent text && payload instanceof TextAnswer answer) {
            validateText(text, answer);
        } else if (content instanceof FollowUpContent && payload instanceof FollowUpAnswer answer) {
            validateFollowUp(sessionId, slide.getId(), participantId, answer);
        }
    }

    private static void validateMcq(McqContent content, McqAnswer answer, int maxSelections) {
        Set<String> optionIds = answer.optionIds();
        if (optionIds == null || optionIds.isEmpty()) {
            throw new ValidationException("at least one option must be selected");
        }
        Set<String> valid = content.options().stream().map(option -> option.id()).collect(Collectors.toSet());
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

    private static void validateQAndA(AnswerPayload payload) {
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

    private static void validateGrid(GridContent content, GridAnswer answer) {
        Map<String, String> placements = answer.placements();
        if (placements == null || placements.isEmpty()) {
            throw new ValidationException("at least one item must be placed");
        }
        Set<String> itemIds = content.items() == null ? Set.of()
                : content.items().stream().map(item -> item.id()).collect(Collectors.toSet());
        int rows = content.rowLabels() == null ? 0 : content.rowLabels().size();
        int columns = content.colLabels() == null ? 0 : content.colLabels().size();
        for (Map.Entry<String, String> placement : placements.entrySet()) {
            if (!itemIds.contains(placement.getKey())) {
                throw new ValidationException("placed item is not on the slide");
            }
            if (!isCellWithin(placement.getValue(), rows, columns)) {
                throw new ValidationException("placement cell is not on the grid");
            }
        }
    }

    private static void validateAxis(AxisContent content, AxisAnswer answer) {
        Map<String, AxisPoint> placements = answer.placements();
        if (placements == null || placements.isEmpty()) {
            throw new ValidationException("at least one item must be placed");
        }
        Set<String> itemIds = content.items() == null ? Set.of()
                : content.items().stream().map(item -> item.id()).collect(Collectors.toSet());
        for (Map.Entry<String, AxisPoint> placement : placements.entrySet()) {
            if (!itemIds.contains(placement.getKey())) {
                throw new ValidationException("placed item is not on the slide");
            }
            if (!isPointOnPlane(placement.getValue())) {
                throw new ValidationException("placement is not on the plane");
            }
        }
    }

    private static void validatePlaceOnImage(PlaceOnImageContent content, PlaceOnImageAnswer answer) {
        Map<String, com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlacePoint> placements =
                answer.placements();
        if (placements == null || placements.isEmpty()) {
            throw new ValidationException("at least one item must be placed");
        }
        Set<String> itemIds = content.items() == null ? Set.of()
                : content.items().stream().map(item -> item.id()).collect(Collectors.toSet());
        for (Map.Entry<String, com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlacePoint>
                placement : placements.entrySet()) {
            if (!itemIds.contains(placement.getKey())) {
                throw new ValidationException("placed item is not on the slide");
            }
            var point = placement.getValue();
            if (point == null || !Double.isFinite(point.x()) || !Double.isFinite(point.y())
                    || point.x() < 0 || point.x() > 1 || point.y() < 0 || point.y() > 1) {
                throw new ValidationException("placement is not on the image");
            }
        }
    }

    private static void validateScales(ScalesContent content, ScalesAnswer answer) {
        Map<String, Double> positions = answer.positions();
        if (positions == null || positions.isEmpty()) {
            throw new ValidationException("at least one statement must be rated");
        }
        Set<String> itemIds = content.items() == null ? Set.of()
                : content.items().stream().map(item -> item.id()).collect(Collectors.toSet());
        for (Map.Entry<String, Double> rating : positions.entrySet()) {
            if (!itemIds.contains(rating.getKey())) {
                throw new ValidationException("rated statement is not on the slide");
            }
            Double position = rating.getValue();
            if (position == null || !Double.isFinite(position) || position < 0 || position > 1) {
                throw new ValidationException("rating is not on the scale");
            }
        }
    }

    private static void validateMatching(MatchingContent content, MatchingAnswer answer) {
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

    private static void validateAllocation(AllocationContent content, AllocationAnswer answer) {
        Map<String, Integer> allocations = answer.allocations();
        if (allocations == null || allocations.isEmpty()) {
            throw new ValidationException("points must be allocated");
        }
        Set<String> optionIds = content.options() == null ? Set.of()
                : content.options().stream().map(option -> option.id()).collect(Collectors.toSet());
        int total = 0;
        for (Map.Entry<String, Integer> allocation : allocations.entrySet()) {
            if (!optionIds.contains(allocation.getKey())) {
                throw new ValidationException("allocated option is not on the slide");
            }
            Integer points = allocation.getValue();
            if (points == null || points < 0 || points > content.totalPointsToAllocate()) {
                throw new ValidationException("allocation is outside the point pool");
            }
            total += points;
        }
        if (!allocations.keySet().containsAll(optionIds)) {
            throw new ValidationException("every option must be allocated (zero is allowed)");
        }
        if (total != content.totalPointsToAllocate()) {
            throw new ValidationException("the whole point pool must be allocated");
        }
    }

    private static void validateDrawing(String sessionId, String participantId, DrawingAnswer answer) {
        AppImage image = answer.image();
        if (image == null || image.isExternal() || image.getSrcKey() == null) {
            throw new ValidationException("a drawing answer must carry an uploaded drawing image");
        }
        if (!image.getSrcKey().startsWith(drawingPrefix(sessionId, participantId))) {
            throw new ValidationException("drawing image was not uploaded by this participant in this session");
        }
    }

    private static void validateText(TextContent content, TextAnswer answer) {
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

    private void validateFollowUp(String sessionId, String slideId, String participantId, FollowUpAnswer answer) {
        String optionId = answer.optionId();
        if (optionId == null || optionId.isBlank()) {
            throw new ValidationException("an option must be selected");
        }
        FollowUpOption option = followUpOptions.load(sessionId, slideId).byId(optionId);
        if (option == null) {
            throw new ValidationException("selected option is not on this round's board");
        }
        if (option.authorParticipantIds() != null && option.authorParticipantIds().contains(participantId)) {
            throw new ConflictException("CANNOT_VOTE_FOR_OWN_ANSWER", "you cannot vote for your own answer");
        }
    }

    private static Set<String> cardIds(List<MatchItem> items) {
        return items == null ? Set.of() : items.stream().map(item -> item.id()).collect(Collectors.toSet());
    }

    private static boolean isPointOnPlane(AxisPoint point) {
        return point != null && Double.isFinite(point.x()) && Double.isFinite(point.y())
                && point.x() >= 0 && point.x() <= 1 && point.y() >= 0 && point.y() <= 1;
    }

    private static boolean isCellWithin(String cell, int rows, int columns) {
        if (cell == null) {
            return false;
        }
        String[] parts = cell.split(",", -1);
        if (parts.length != 2) {
            return false;
        }
        try {
            int row = Integer.parseInt(parts[0]);
            int column = Integer.parseInt(parts[1]);
            return row >= 0 && row < rows && column >= 0 && column < columns;
        } catch (NumberFormatException malformed) {
            return false;
        }
    }

    private static String drawingPrefix(String sessionId, String participantId) {
        return DRAWING_KEY_NAMESPACE + sessionId + "/" + participantId + "/";
    }
}
