package com.cephadex.ambi.session.roundResult;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.AllocationContent;
import com.cephadex.ambi.presentation.slide.content.GridContent;
import com.cephadex.ambi.presentation.slide.content.MatchingContent;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.NumberContent;
import com.cephadex.ambi.presentation.slide.content.PlaceOnImageContent;
import com.cephadex.ambi.presentation.slide.content.RankingContent;
import com.cephadex.ambi.presentation.slide.content.ScalesContent;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.content.TextContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchMode;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.Target;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.AllocationAnswer;
import com.cephadex.ambi.session.answer.payload.AnswerPayload;
import com.cephadex.ambi.session.answer.payload.GridAnswer;
import com.cephadex.ambi.session.answer.payload.MatchingAnswer;
import com.cephadex.ambi.session.answer.payload.McqAnswer;
import com.cephadex.ambi.session.answer.payload.NumberAnswer;
import com.cephadex.ambi.session.answer.payload.PlaceOnImageAnswer;
import com.cephadex.ambi.session.answer.payload.RankingAnswer;
import com.cephadex.ambi.session.answer.payload.ScalesAnswer;
import com.cephadex.ambi.session.answer.payload.TextAnswer;

/**
 * Derives the per-participant facts of a round <b>once</b>, from the slide and
 * the
 * submitted answers, so scoring and the {@link RoundResult} record read the
 * same
 * {@link AnswerEvaluation}s instead of each re-deriving them.
 *
 * <p>
 * Pure and side-effect free: it touches no participant state and persists
 * nothing, so it is safe to re-run (e.g. on {@code restartRound}). The caller
 * sequences the round close:
 *
 * <pre>
 *   var evals = RoundEvaluator.evaluate(slide, answers, startedAt);   // derive once
 *   var outcomes = evals.stream().map(e -&gt; {
 *       int pts = participantOf(e.participantId()).awardPoints(        // mutate score
 *               e.correct(), e.bestAnswer(), e.fastestCorrect(), e.deceivedCount(),
 *               settings...);
 *       return new ParticipantOutcome(
 *               e.participantId(), e.choice(), e.correct(), pts, e.responseTimeMs());
 *   }).toList();
 *   RoundResult.compute(sid, slide, outcomes, closedAt);              // record
 * </pre>
 *
 * <p>
 * This is the single home for grading: {@link #isCorrect} compares an answer
 * against the slide's typed {@link SlideContent} answer key, and
 * {@link #correctKey} renders that key for the results reveal. Content types with
 * no static key (derived / voted / free-form) never grade correct.
 */
public final class RoundEvaluator {

    private RoundEvaluator() {
    }

    public static List<AnswerEvaluation> evaluate(Slide slide, List<Answer> answers, Instant roundStartedAt) {
        // Content-independent facts + the correctness grade, in one pass; we track
        // the fastest correct responder so exactly one evaluation is flagged.
        record Graded(String participantId, String choice, boolean correct, long responseTimeMs) {
        }
        List<Graded> graded = new ArrayList<>(answers.size());

        String fastest = null;
        long fastestMs = Long.MAX_VALUE;

        for (Answer answer : answers) {
            String pid = new String(answer.getParticipantId());
            long responseTimeMs = responseTime(roundStartedAt, answer.getSubmittedAt());
            boolean correct = isCorrect(slide, answer.getPayload());
            String choice = describeChoice(answer.getPayload());

            graded.add(new Graded(pid, choice, correct, responseTimeMs));

            if (correct && responseTimeMs < fastestMs) {
                fastestMs = responseTimeMs;
                fastest = pid;
            }
        }

        List<AnswerEvaluation> evaluations = new ArrayList<>(graded.size());
        for (Graded g : graded) {
            boolean fastestCorrect = g.correct() && g.participantId().equals(fastest);
            evaluations.add(new AnswerEvaluation(
                    g.participantId(),
                    g.choice(),
                    g.correct(),
                    fastestCorrect,
                    false, // bestAnswer — SEAM (see below)
                    0, // deceivedCount — SEAM (see below)
                    g.responseTimeMs()));
        }
        return evaluations;
    }

    private static long responseTime(Instant startedAt, Instant submittedAt) {
        if (startedAt == null || submittedAt == null) {
            return 0L;
        }
        return Math.max(0L, Duration.between(startedAt, submittedAt).toMillis());
    }

    /**
     * Grades {@code payload} against the slide's typed {@link SlideContent} answer
     * key. The pairing is total over the sealed {@link AnswerPayload} hierarchy: a
     * mismatched content/answer pairing (which shouldn't occur) grades false. Types
     * with no static key — follow-up prompts, drawings, Q&amp;A questions — always
     * grade false; a few graded modes that need cross-participant context
     * ({@code CLOSEST}/{@code NEAREST}/{@code DISTANCE}) or per-position partial
     * credit ({@code PARTIAL}) are explicit seams that return false for the boolean.
     */
    private static boolean isCorrect(Slide slide, AnswerPayload payload) {
        SlideContent content = slide.getContent();
        if (content == null || payload == null) {
            return false;
        }
        return switch (payload) {
            case McqAnswer a -> content instanceof McqContent c && gradeMcq(c, a);
            case NumberAnswer a -> content instanceof NumberContent c && gradeNumber(c, a);
            case TextAnswer a -> content instanceof TextContent c && gradeText(c, a);
            case RankingAnswer a -> content instanceof RankingContent c && gradeRanking(c, a);
            case MatchingAnswer a -> content instanceof MatchingContent c && gradeMatching(c, a);
            case GridAnswer a -> content instanceof GridContent c && gradeGrid(c, a);
            case ScalesAnswer a -> content instanceof ScalesContent c && gradeScales(c, a);
            case AllocationAnswer a -> content instanceof AllocationContent c && gradeAllocation(c, a);
            case PlaceOnImageAnswer a -> content instanceof PlaceOnImageContent c && gradePlaceOnImage(c, a);
            // No static answer key: derived from parent submissions, drawn, or asked.
            case com.cephadex.ambi.session.answer.payload.FollowUpAnswer _ -> false;
            case com.cephadex.ambi.session.answer.payload.DrawingAnswer _ -> false;
            case com.cephadex.ambi.session.answer.payload.QAndAAnswer _ -> false;
        };
    }

    private static boolean gradeMcq(McqContent content, McqAnswer answer) {
        Set<String> key = content.correctOptionIds();
        // Exact set match — order-independent; a single-select answer is a 1-element set.
        return key != null && key.equals(answer.optionIds());
    }

    private static boolean gradeNumber(NumberContent content, NumberAnswer answer) {
        BigDecimal target = content.answer();
        if (target == null) {
            return false;
        }
        BigDecimal value = BigDecimal.valueOf(answer.value());
        return switch (content.scoreMode()) {
            case EXACT -> target.compareTo(value) == 0;
            case RANGE -> content.tolerance() != null
                    && value.subtract(target).abs().compareTo(content.tolerance()) <= 0;
            // CLOSEST is relative to the field of answers — a scoring pass over all
            // participants, not a per-answer grade. Seam.
            default -> false;
        };
    }

    private static boolean gradeText(TextContent content, TextAnswer answer) {
        Set<String> accepted = content.acceptedAnswers();
        // WORDCLOUD / empty accepted set = unscored display.
        if (content.matchMode() == MatchMode.WORDCLOUD || accepted == null || accepted.isEmpty()) {
            return false;
        }
        String submitted = normalizeText(answer.text(), content);
        if (submitted == null) {
            return false;
        }
        return switch (content.matchMode()) {
            case EXACT -> accepted.stream().anyMatch(acc -> submitted.equals(normalizeText(acc, content)));
            case CONTAINS -> accepted.stream()
                    .map(acc -> normalizeText(acc, content))
                    .filter(acc -> acc != null && !acc.isEmpty())
                    .anyMatch(submitted::contains);
            case WORDCLOUD -> false;
        };
    }

    private static String normalizeText(String text, TextContent content) {
        if (text == null) {
            return null;
        }
        String normalized = content.trimWhitespace() ? text.strip() : text;
        return content.caseSensitive() ? normalized : normalized.toLowerCase();
    }

    private static boolean gradeRanking(RankingContent content, RankingAnswer answer) {
        // EXACT: the whole ordering must match. PARTIAL (per-position credit) is a
        // points concern, not a boolean-correct one — seam.
        return content.scoreMode() == ScoreMode.EXACT
                && content.correctOrder() != null
                && content.correctOrder().equals(answer.orderedItemIds());
    }

    private static boolean gradeMatching(MatchingContent content, MatchingAnswer answer) {
        return content.scoreMode() == ScoreMode.EXACT
                && content.correctPairs() != null
                && content.correctPairs().equals(answer.matches());
    }

    private static boolean gradeGrid(GridContent content, GridAnswer answer) {
        return content.scoreMode() == ScoreMode.EXACT
                && content.correctCells() != null
                && content.correctCells().equals(answer.placements());
    }

    private static boolean gradeScales(ScalesContent content, ScalesAnswer answer) {
        Map<String, Double> key = content.correctValues();
        Map<String, Integer> ratings = answer.ratings();
        if (key == null || key.isEmpty() || ratings == null) {
            return false;
        }
        // Every keyed item must be rated within ± tolerance of its target.
        for (Map.Entry<String, Double> e : key.entrySet()) {
            Integer rating = ratings.get(e.getKey());
            if (rating == null || Math.abs(rating - e.getValue()) > content.tolerance()) {
                return false;
            }
        }
        return true;
    }

    private static boolean gradeAllocation(AllocationContent content, AllocationAnswer answer) {
        Map<String, Integer> key = content.correctAllocations();
        Map<String, Integer> allocations = answer.allocations();
        if (key == null || key.isEmpty() || allocations == null) {
            return false;
        }
        // Each option's allocation must be within ± tolerancePerOption of its target.
        for (Map.Entry<String, Integer> e : key.entrySet()) {
            int allocated = allocations.getOrDefault(e.getKey(), 0);
            if (Math.abs(allocated - e.getValue()) > content.tolerancePerOption()) {
                return false;
            }
        }
        return true;
    }

    private static boolean gradePlaceOnImage(PlaceOnImageContent content, PlaceOnImageAnswer answer) {
        // INSIDE_RADIUS: the pin lands inside any target circle. NEAREST/DISTANCE are
        // relative/graded-distance scoring, not a per-answer boolean — seam.
        if (content.scoreMode() != ScoreMode.INSIDE_RADIUS || content.correctTargets() == null) {
            return false;
        }
        for (Target target : content.correctTargets()) {
            double dx = answer.x() - target.x();
            double dy = answer.y() - target.y();
            if (Math.hypot(dx, dy) <= target.radius()) {
                return true;
            }
        }
        return false;
    }

    /**
     * A compact, record-friendly rendering of the participant's selection, used for
     * the round's option tallies. Only the scalar-keyed types render a value
     * (MCQ, number, text); map/coordinate selections (matching, grid, scales,
     * place-on-image, allocation, ranking) return null and are simply not counted.
     * {@link #correctKey} renders the correct answer in the same shape so the two
     * collate in {@code RoundResult.optionCounts}.
     */
    private static String describeChoice(AnswerPayload payload) {
        return switch (payload) {
            // Sorted so multi-select choices tally under a stable key.
            case McqAnswer mcq -> joinSorted(mcq.optionIds());
            case NumberAnswer number -> String.valueOf(number.value());
            case TextAnswer text -> text.text();
            default -> null;
        };
    }

    /**
     * Renders the slide's correct-answer key in the same shape as
     * {@link #describeChoice}, so the reveal's {@code correctOption} lines up with
     * the option tallies. Returns null for content with no single collatable key
     * (multiple accepted texts, map/coordinate keys, or no static key at all).
     */
    public static String correctKey(Slide slide) {
        SlideContent content = slide.getContent();
        if (content instanceof McqContent mcq) {
            return joinSorted(mcq.correctOptionIds());
        }
        if (content instanceof NumberContent number
                && number.scoreMode() == ScoreMode.EXACT && number.answer() != null) {
            // Collates with describeChoice(NumberAnswer) = String.valueOf(double).
            return String.valueOf(number.answer().doubleValue());
        }
        if (content instanceof TextContent text
                && text.acceptedAnswers() != null && text.acceptedAnswers().size() == 1) {
            return text.acceptedAnswers().iterator().next();
        }
        return null;
    }

    private static String joinSorted(Set<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return null;
        }
        return ids.stream().sorted().reduce((a, b) -> a + "," + b).orElse(null);
    }
}
