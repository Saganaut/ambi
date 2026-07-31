package com.cephadex.ambi.session.roundResult;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.AllocationContent;
import com.cephadex.ambi.presentation.slide.content.AxisContent;
import com.cephadex.ambi.presentation.slide.content.FollowUpContent;
import com.cephadex.ambi.presentation.slide.content.GridContent;
import com.cephadex.ambi.presentation.slide.content.MatchingContent;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.NumberContent;
import com.cephadex.ambi.presentation.slide.content.PlaceOnImageContent;
import com.cephadex.ambi.presentation.slide.content.RankingContent;
import com.cephadex.ambi.presentation.slide.content.ScalesContent;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.content.TextContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisPoint;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchMode;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlacePoint;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.Target;
import com.cephadex.ambi.presentation.slide.enums.FollowUpMode;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.AllocationAnswer;
import com.cephadex.ambi.session.answer.payload.AnswerPayload;
import com.cephadex.ambi.session.answer.payload.AxisAnswer;
import com.cephadex.ambi.session.answer.payload.FollowUpAnswer;
import com.cephadex.ambi.session.answer.payload.GridAnswer;
import com.cephadex.ambi.session.answer.payload.MatchingAnswer;
import com.cephadex.ambi.session.answer.payload.McqAnswer;
import com.cephadex.ambi.session.answer.payload.NumberAnswer;
import com.cephadex.ambi.session.answer.payload.PlaceOnImageAnswer;
import com.cephadex.ambi.session.answer.payload.RankingAnswer;
import com.cephadex.ambi.session.answer.payload.ScalesAnswer;
import com.cephadex.ambi.session.answer.payload.TextAnswer;
import com.cephadex.ambi.session.followUp.FollowUpOption;
import com.cephadex.ambi.session.followUp.FollowUpOptionSet;

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
 *
 * <p>
 * A follow-up round is the exception that proves the rule: its answer key is
 * runtime state, not slide content, so callers thread the round's saved
 * {@link FollowUpOptionSet} in alongside the slide. Only
 * {@link FollowUpMode#SPOT_THE_ANSWER} has a key at all, and it is never
 * <em>revealed</em> — {@link #correctKey} deliberately grows no follow-up
 * branch, so a follow-up round's {@code correctOption} stays null and the board
 * renders no correct-answer affordance.
 */
public final class RoundEvaluator {

    private RoundEvaluator() {
    }

    /** Evaluates a round without best-answer voting (no vote tallies to fold in). */
    public static List<AnswerEvaluation> evaluate(Slide slide, List<Answer> answers, Instant roundStartedAt) {
        return evaluate(slide, answers, roundStartedAt, Map.of());
    }

    /** Evaluates a voted round that is not a follow-up (nothing to grade a pick against). */
    public static List<AnswerEvaluation> evaluate(Slide slide, List<Answer> answers, Instant roundStartedAt,
            Map<String, Integer> votesReceived) {
        return evaluate(slide, answers, roundStartedAt, votesReceived, FollowUpOptionSet.empty(), Map.of());
    }

    /**
     * Evaluates a round, folding in the best-answer votes collected during a VOTE
     * phase (D3). {@code votesReceived} maps each answer's <em>author</em> to how
     * many votes their submission drew (empty when the round wasn't voted on):
     * <ul>
     * <li>{@code bestAnswer} — the top-voted answer; a tie goes to the faster
     * submission (mirroring the fastest-correct rule), then the lower participant
     * id so the flag is deterministic. At most one evaluation is flagged, and none
     * when no votes were cast.</li>
     * <li>{@code deceivedCount} — the votes drawn by an answer that graded
     * <em>incorrect</em>: every such vote is a deceived voter. Votes for a correct
     * answer deceive nobody; on the creative types where nothing grades correct
     * (Drawing, free text), whether those votes pay is the deck's call via
     * {@code deceptionPoints}.</li>
     * </ul>
     *
     * <p>The last two arguments are the follow-up dimension, both empty for every
     * other kind of round and both read from the <em>snapshot</em> the round
     * opened on (never a re-mint):
     * <ul>
     * <li>{@code followUpOptions} — the candidate set a pick is graded against.
     * On a {@link FollowUpMode#SPOT_THE_ANSWER} round exactly one candidate may
     * carry the parent's authored answer, and picking it is what
     * {@code correct} means; see {@link #isCorrect}.</li>
     * <li>{@code followUpPicksByAuthor} — how many picks each candidate's
     * <em>author</em> drew from other participants, computed by the caller with
     * {@link #followUpPicksByAuthor}. It is added to {@code deceivedCount}, so a
     * card that fooled the room pays through the same
     * {@code deceptionPoints} mechanic a VOTE-phase deception does. Unlike a
     * vote, it is <strong>not</strong> zeroed when its author also picked
     * correctly: spotting the authored answer and writing a card that fooled
     * others are two independent earnings in the same round.</li>
     * </ul>
     */
    public static List<AnswerEvaluation> evaluate(Slide slide, List<Answer> answers, Instant roundStartedAt,
            Map<String, Integer> votesReceived, FollowUpOptionSet followUpOptions,
            Map<String, Integer> followUpPicksByAuthor) {
        // Content-independent facts + the correctness grade, in one pass; we track
        // the fastest correct responder and the best-voted answer so exactly one
        // evaluation carries each flag.
        record Graded(String participantId, String choice, boolean correct, long responseTimeMs, int votes,
                int picksDrawn) {
        }
        List<Graded> graded = new ArrayList<>(answers.size());

        String fastest = null;
        long fastestMs = Long.MAX_VALUE;
        Graded best = null;

        for (Answer answer : answers) {
            String pid = new String(answer.getParticipantId());
            long responseTimeMs = responseTime(roundStartedAt, answer.getSubmittedAt());
            boolean correct = isCorrect(slide, answer.getPayload(), followUpOptions);
            String choice = describeChoice(answer.getPayload());
            int votes = votesReceived.getOrDefault(pid, 0);
            int picksDrawn = followUpPicksByAuthor.getOrDefault(pid, 0);

            Graded g = new Graded(pid, choice, correct, responseTimeMs, votes, picksDrawn);
            graded.add(g);

            if (correct && responseTimeMs < fastestMs) {
                fastestMs = responseTimeMs;
                fastest = pid;
            }
            if (votes > 0 && (best == null || votes > best.votes()
                    || (votes == best.votes() && responseTimeMs < best.responseTimeMs())
                    || (votes == best.votes() && responseTimeMs == best.responseTimeMs()
                            && pid.compareTo(best.participantId()) < 0))) {
                best = g;
            }
        }

        List<AnswerEvaluation> evaluations = new ArrayList<>(graded.size());
        for (Graded g : graded) {
            boolean fastestCorrect = g.correct() && g.participantId().equals(fastest);
            boolean bestAnswer = best != null && g.participantId().equals(best.participantId());
            evaluations.add(new AnswerEvaluation(
                    g.participantId(),
                    g.choice(),
                    g.correct(),
                    fastestCorrect,
                    bestAnswer,
                    (g.correct() ? 0 : g.votes()) + g.picksDrawn(),
                    g.responseTimeMs()));
        }
        return evaluations;
    }

    /**
     * How many picks each candidate's <em>author</em> drew from other
     * participants on a {@link FollowUpMode#SPOT_THE_ANSWER} round — the
     * author-side half of that mode's scoring, in the same per-author shape as
     * the VOTE phase's {@code votesReceived}.
     *
     * <p>Every mode but {@code SPOT_THE_ANSWER} returns empty: the other two
     * follow-ups are unscored, so a pick pays nobody. Authorship is read from
     * the round's saved {@link FollowUpOptionSet} — the only place it exists —
     * and one pick credits <em>every</em> author of the picked candidate, since
     * merged submissions genuinely share the card. Whether that card is also the
     * seeded authored answer makes no difference: a participant whose wording
     * happened to match the answer key still wrote the submission the pick went
     * to. Self-picks are excluded (the answer service already rejects them with
     * {@code CANNOT_VOTE_FOR_OWN_ANSWER}; this is defense in depth against a
     * pick that predates a re-mint).
     *
     * <p>Note the returned map covers authors who never answered <em>this</em>
     * round — their submission was to the <em>parent</em> round. Crediting them
     * is {@code RoundScorer}'s job, since they have no {@link AnswerEvaluation}.
     */
    public static Map<String, Integer> followUpPicksByAuthor(Slide slide, List<Answer> answers,
            FollowUpOptionSet followUpOptions) {
        if (followUpOptions == null || followUpOptions.options().isEmpty()
                || !(slide.getContent() instanceof FollowUpContent content)
                || content.mode() != FollowUpMode.SPOT_THE_ANSWER) {
            return Map.of();
        }
        Map<String, Integer> byAuthor = new LinkedHashMap<>();
        for (Answer answer : answers) {
            if (!(answer.getPayload() instanceof FollowUpAnswer pick) || pick.optionId() == null) {
                continue;
            }
            FollowUpOption picked = followUpOptions.byId(pick.optionId());
            if (picked == null || picked.authorParticipantIds() == null) {
                continue;
            }
            String picker = answer.getParticipantId();
            for (String author : picked.authorParticipantIds()) {
                if (author != null && !author.equals(picker)) {
                    byAuthor.merge(author, 1, (a, b) -> a + b);
                }
            }
        }
        return byAuthor;
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
     * with no static key — drawings, Q&amp;A questions — always grade false; a few
     * graded modes that need cross-participant context
     * ({@code CLOSEST}/{@code NEAREST}/{@code DISTANCE}) or per-position partial
     * credit ({@code PARTIAL}) are explicit seams that return false for the boolean.
     *
     * <p>A follow-up pick is the one grade whose key is not on the slide at all:
     * it lives in the round's minted {@link FollowUpOptionSet}, so that snapshot
     * is threaded in — see {@link #gradeFollowUp}.
     */
    private static boolean isCorrect(Slide slide, AnswerPayload payload, FollowUpOptionSet followUpOptions) {
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
            case AxisAnswer a -> content instanceof AxisContent c && gradeAxis(c, a);
            case ScalesAnswer a -> content instanceof ScalesContent c && gradeScales(c, a);
            case AllocationAnswer a -> content instanceof AllocationContent c && gradeAllocation(c, a);
            case PlaceOnImageAnswer a -> content instanceof PlaceOnImageContent c && gradePlaceOnImage(c, a);
            // Graded against the round's minted board, not the slide's content.
            case FollowUpAnswer a -> content instanceof FollowUpContent c
                    && gradeFollowUp(c, a, followUpOptions);
            // No static answer key: drawn or asked.
            case com.cephadex.ambi.session.answer.payload.DrawingAnswer _ -> false;
            case com.cephadex.ambi.session.answer.payload.QAndAAnswer _ -> false;
            case com.cephadex.ambi.session.answer.payload.QAndAQuestions _ -> false;
        };
    }

    /**
     * A follow-up pick is correct only on {@link FollowUpMode#SPOT_THE_ANSWER},
     * and only when it lands on the candidate the mint seeded from the parent's
     * authored answer. The other two modes ask which submission was best or most
     * popular — questions with no right answer — so they keep grading false, and
     * so does a {@code SPOT_THE_ANSWER} round whose parent had lost its answer
     * key by mint time: nothing carries the flag, so nothing can be spotted.
     *
     * <p>The flag is read from the round's <em>saved</em> option set, the same
     * board the pick was validated against, so grading can never disagree with
     * what the participant saw.
     */
    private static boolean gradeFollowUp(FollowUpContent content, FollowUpAnswer answer,
            FollowUpOptionSet followUpOptions) {
        if (content.mode() != FollowUpMode.SPOT_THE_ANSWER
                || followUpOptions == null || answer.optionId() == null) {
            return false;
        }
        FollowUpOption picked = followUpOptions.byId(answer.optionId());
        return picked != null && picked.authoredAnswer();
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
        String submitted = content.normalize(answer.text());
        if (submitted == null) {
            return false;
        }
        return switch (content.matchMode()) {
            case EXACT -> accepted.stream().anyMatch(acc -> submitted.equals(content.normalize(acc)));
            case CONTAINS -> accepted.stream()
                    .map(content::normalize)
                    .filter(acc -> acc != null && !acc.isEmpty())
                    .anyMatch(submitted::contains);
            case WORDCLOUD -> false;
        };
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

    private static boolean gradeAxis(AxisContent content, AxisAnswer answer) {
        // gradeScales' loop-over-answer-key composed with gradePlaceOnImage's
        // radius test: every keyed item must land within tolerance of its target.
        // An empty key marks an unscored collect-only plane. INSIDE_RADIUS is the
        // only implemented mode; PARTIAL/DISTANCE-style credit is a seam.
        if (content.scoreMode() != ScoreMode.INSIDE_RADIUS
                || content.correctPositions() == null || content.correctPositions().isEmpty()
                || answer.placements() == null) {
            return false;
        }
        for (Map.Entry<String, AxisPoint> e : content.correctPositions().entrySet()) {
            AxisPoint placed = answer.placements().get(e.getKey());
            if (placed == null || Math.hypot(placed.x() - e.getValue().x(),
                    placed.y() - e.getValue().y()) > content.tolerance()) {
                return false;
            }
        }
        return true;
    }

    private static boolean gradeScales(ScalesContent content, ScalesAnswer answer) {
        Map<String, Double> key = content.correctValues();
        Map<String, Double> positions = answer.positions();
        if (key == null || key.isEmpty() || positions == null) {
            return false;
        }
        // Positions arrive normalized ([0, 1]); denormalize each with content in
        // scope, then require every keyed statement within ± tolerance (scale
        // units) of its target. An empty key marks an unscored collect-only slide.
        double span = content.max() - content.min();
        for (Map.Entry<String, Double> e : key.entrySet()) {
            Double p = positions.get(e.getKey());
            if (p == null
                    || Math.abs(content.min() + p * span - e.getValue()) > content.tolerance()) {
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
        // INSIDE_RADIUS, per item: every target's pin must land inside that
        // target's own radius (gradeAxis's loop-over-answer-key, but each target
        // carries its own tolerance instead of one shared plane tolerance). With
        // no targets there is nothing to place (an empty bank), so it never
        // grades correct; NEAREST/DISTANCE are relative/graded-distance scoring,
        // not a per-answer boolean — seam.
        if (content.scoreMode() != ScoreMode.INSIDE_RADIUS
                || content.correctTargets() == null || content.correctTargets().isEmpty()
                || answer.placements() == null) {
            return false;
        }
        for (Target target : content.correctTargets()) {
            PlacePoint placed = answer.placements().get(target.id());
            if (placed == null || Math.hypot(placed.x() - target.x(),
                    placed.y() - target.y()) > target.radius()) {
                return false;
            }
        }
        return true;
    }

    /**
     * A compact, record-friendly rendering of the participant's selection, used for
     * the round's option tallies. Only the scalar-keyed types render a value
     * (MCQ, number, text, and a follow-up pick's option id); map/coordinate
     * selections (matching, grid, scales, place-on-image, allocation, ranking)
     * return null and are simply not counted.
     * {@link #correctKey} renders the correct answer in the same shape so the two
     * collate in {@code RoundResult.optionCounts}.
     */
    private static String describeChoice(AnswerPayload payload) {
        return switch (payload) {
            // Sorted so multi-select choices tally under a stable key.
            case McqAnswer mcq -> joinSorted(mcq.optionIds());
            case NumberAnswer number -> String.valueOf(number.value());
            case TextAnswer text -> text.text();
            // The pick on a follow-up board is that round's answer, so the
            // candidate's option id is the choice.
            case FollowUpAnswer followUp -> followUp.optionId();
            default -> null;
        };
    }

    /**
     * Renders the slide's correct-answer key in the same shape as
     * {@link #describeChoice}, so the reveal's {@code correctOption} lines up with
     * the option tallies. Returns null for content with no single collatable key
     * (multiple accepted texts, map/coordinate keys, or no static key at all).
     *
     * <p>Ranking is the one reveal-only exception: its list-shaped answer isn't
     * collated as a tally choice ({@code describeChoice} returns null for it),
     * but the board still needs the correct order at reveal, so this renders it
     * as the comma-joined id list for the client to split back apart.
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
        if (content instanceof RankingContent ranking && ranking.correctOrder() != null) {
            // The correct order joined top → bottom; item ids are client-minted
            // alphanumerics that never contain a comma, so the board splits this
            // back into the ordered id list at reveal. This is a whole-ordering
            // reveal string, not a per-position tally key — it stands apart from
            // describeChoice (which returns null for ranking's list-shaped answer).
            return String.join(",", ranking.correctOrder());
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
