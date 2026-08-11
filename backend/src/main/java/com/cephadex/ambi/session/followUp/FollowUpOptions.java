package com.cephadex.ambi.session.followUp;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.AllocationContent;
import com.cephadex.ambi.presentation.slide.content.AxisContent;
import com.cephadex.ambi.presentation.slide.content.DrawingContent;
import com.cephadex.ambi.presentation.slide.content.GridContent;
import com.cephadex.ambi.presentation.slide.content.MatchingContent;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.NumberContent;
import com.cephadex.ambi.presentation.slide.content.PlaceOnImageContent;
import com.cephadex.ambi.presentation.slide.content.RankingContent;
import com.cephadex.ambi.presentation.slide.content.ScalesContent;
import com.cephadex.ambi.presentation.slide.content.TextContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisPoint;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlacePoint;
import com.cephadex.ambi.presentation.slide.enums.FollowUpMode;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.AllocationAnswer;
import com.cephadex.ambi.session.answer.payload.AnswerPayload;
import com.cephadex.ambi.session.answer.payload.AxisAnswer;
import com.cephadex.ambi.session.answer.payload.DrawingAnswer;
import com.cephadex.ambi.session.answer.payload.GridAnswer;
import com.cephadex.ambi.session.answer.payload.MatchingAnswer;
import com.cephadex.ambi.session.answer.payload.NumberAnswer;
import com.cephadex.ambi.session.answer.payload.PlaceOnImageAnswer;
import com.cephadex.ambi.session.answer.payload.RankingAnswer;
import com.cephadex.ambi.session.answer.payload.ScalesAnswer;
import com.cephadex.ambi.session.answer.payload.TextAnswer;

/**
 * Mints the candidate set a follow-up round votes on, from the parent slide and
 * the answers its round collected.
 *
 * <p>
 * Pure and side-effect free like
 * {@link com.cephadex.ambi.session.roundResult.RoundScorer} — no Spring, no I/O
 * — so the caller owns reading the answers and presigning: images resolve
 * through the passed {@code imageUrl} function rather than an injected
 * resolver. It is deterministic in everything but one deliberate draw: a
 * {@link FollowUpMode#SPOT_THE_ANSWER} board is laid out in an order shuffled
 * from a {@link SecureRandom}, because any arrangement a client could
 * reconstruct — or diff two mints of — would point at the seeded answer (see
 * {@link #finishShuffled}).
 *
 * <p>
 * <strong>Ids are derived, never random.</strong> Every option id is a UUID
 * hashed from the content it stands for (the authored option id for MCQ, the
 * normalized text for TEXT, the stored image key for DRAWING, the rendered
 * summary for the structured kinds), so re-minting over the same submissions
 * reproduces the same set — a restarted round keeps the votes already cast
 * against it meaningful instead of orphaning them. Ordering is derived the same
 * way for every mode but one: authored order for MCQ, and submission order
 * ({@code submittedAt}, ties broken by participant id) for the kinds minted
 * from answers, so two mints of one round also agree on the layout. The
 * exception is {@link FollowUpMode#SPOT_THE_ANSWER}, whose whole board is
 * shuffled per mint on purpose (see {@link #finishShuffled}); those cards'
 * <em>ids</em> are content-derived like every other, so a re-mint still
 * reproduces the same ids, only in a different arrangement.
 *
 * <p>
 * <strong>Structured submissions become text summaries.</strong> Every scorable
 * parent except {@code FOLLOW_UP} itself can be voted on, but only MCQ, TEXT and
 * DRAWING have a submission a board can show verbatim. The rest (a ranking, a
 * set of placements, an allocation, …) are rendered into one compact line built
 * from the parent's own <em>labels</em> — never raw item ids — which is then both
 * the candidate's display text and its dedup key, so two participants whose
 * submissions read identically share one card. Rendering walks the parent's
 * authored items rather than the answer's map, because a {@code Map} payload has
 * no order to rely on and the key has to be stable; an answer entry naming an
 * item the content no longer has is simply never visited.
 *
 * <p>
 * <strong>One mode also seeds the authored answer.</strong>
 * {@link FollowUpMode#SPOT_THE_ANSWER} mixes the parent's own authored answer
 * into the submissions — the answer key's wording on a TEXT parent
 * ({@link #withAuthoredAnswer}), the authored {@code correctImage} on a DRAWING
 * one ({@link #withAuthoredImage}) — keyed and merged exactly like one of them,
 * and marks it {@link FollowUpOption#authoredAnswer()}: the single bit grading
 * later reads, and the one thing about a candidate that must never travel to a
 * client. Both parent kinds degrade the same way when the authored answer is
 * missing (an ordinary vote board with nothing flagged), and both end on a
 * shuffle. Every other mode mints the same set it always did, so the mode
 * reaches this class only to answer "does the authored answer belong on this
 * board?".
 */
public final class FollowUpOptions {

    /** Between the per-item parts of one summary, e.g. {@code "Alpha → A · Beta → B"}. */
    private static final String PART_SEPARATOR = " · ";

    /** Between two ranked items, best first. */
    private static final String RANK_SEPARATOR = " > ";

    /** Between the two halves of a matched pair. */
    private static final String PAIR_SEPARATOR = " ↔ ";

    /** Between an item and where its author put it. */
    private static final String PLACED_AT = " → ";

    /** Between the row and column halves of a grid cell's label. */
    private static final String CELL_SEPARATOR = "/";

    /**
     * Decimals a scales position is rounded to for display. Also the dedup grain
     * on a continuous track: two markers within a tenth of a scale unit of each
     * other read as the same answer, so they share one candidate.
     */
    private static final int SCALE_DECIMALS = 1;

    /**
     * Draws the order a {@code SPOT_THE_ANSWER} board is laid out in (see
     * {@link #finishShuffled}). Thread-safe, and seeded by the platform.
     */
    private static final SecureRandom BOARD_ORDER = new SecureRandom();

    private static final BoardShuffler BOARD_SHUFFLER = options -> Collections.shuffle(options, BOARD_ORDER);

    private FollowUpOptions() {
    }

    /**
     * The candidates for the follow-up chained off {@code parent}.
     *
     * <ul>
     * <li><strong>MCQ parent</strong> — the authored choices themselves, in
     * authored order, carrying their own ids so the follow-up's tallies line up
     * with the parent's; no submission stands behind them, so their author sets
     * are empty;</li>
     * <li><strong>TEXT parent</strong> — the submitted texts, deduplicated under
     * the parent's own answer-matching settings (see
     * {@link TextContent#normalize}), so "Paris" and " paris " become one
     * candidate that both submitters authored. The earliest submission supplies
     * the display text. On a {@link FollowUpMode#SPOT_THE_ANSWER} follow-up the
     * parent's authored answer is seeded in as one more candidate — see
     * {@link #withAuthoredAnswer};</li>
     * <li><strong>DRAWING parent</strong> — one candidate per submitted image
     * (an answer that never produced one is skipped). On a
     * {@link FollowUpMode#SPOT_THE_ANSWER} follow-up the parent's authored
     * {@code correctImage} is seeded in among them — see
     * {@link #withAuthoredImage};</li>
     * <li><strong>every other scorable parent</strong> — one candidate per
     * distinct submission, rendered as a compact text summary of it (see the
     * {@code summaryOf} overloads); submissions whose summaries match merge,
     * exactly as matching texts do;</li>
     * <li><strong>a follow-up or non-scorable parent</strong>, or no parent at
     * all — nothing to vote on, so the set is empty.</li>
     * </ul>
     *
     * @param parent        the parent slide of the follow-up (its
     *                      {@code childId} is the follow-up), or {@code null}
     * @param parentAnswers every answer the parent's round collected
     * @param mode          what the follow-up asks — only
     *                      {@link FollowUpMode#SPOT_THE_ANSWER} changes what is
     *                      minted; {@code null} mints as an ordinary vote board
     * @param imageUrl      resolves a stored image to a URL the board can render
     *                      (the caller passes the presigner at the size it
     *                      projects at); may return {@code null}
     */
    public static FollowUpOptionSet mint(Slide parent, List<Answer> parentAnswers, FollowUpMode mode,
            Function<AppImage, String> imageUrl) {
        return mint(parent, parentAnswers, mode, imageUrl, BOARD_SHUFFLER);
    }

    static FollowUpOptionSet mint(Slide parent, List<Answer> parentAnswers, FollowUpMode mode,
            Function<AppImage, String> imageUrl, BoardShuffler boardShuffler) {
        Objects.requireNonNull(parentAnswers, "parentAnswers required");
        Objects.requireNonNull(imageUrl, "imageUrl required");
        Objects.requireNonNull(boardShuffler, "boardShuffler required");
        if (parent == null) {
            return FollowUpOptionSet.empty();
        }
        return switch (parent.getContent()) {
            case McqContent mcq -> fromMcq(mcq, imageUrl);
            case TextContent text -> fromText(text, parentAnswers, mode, boardShuffler);
            case DrawingContent drawing -> fromDrawings(drawing, parentAnswers, mode, imageUrl, boardShuffler);
            case NumberContent number -> fromSummaries(parentAnswers,
                    NumberAnswer.class, answer -> summaryOf(number, answer));
            case RankingContent ranking -> fromSummaries(parentAnswers,
                    RankingAnswer.class, answer -> summaryOf(ranking, answer));
            case MatchingContent matching -> fromSummaries(parentAnswers,
                    MatchingAnswer.class, answer -> summaryOf(matching, answer));
            case GridContent grid -> fromSummaries(parentAnswers,
                    GridAnswer.class, answer -> summaryOf(grid, answer));
            case AllocationContent allocation -> fromSummaries(parentAnswers,
                    AllocationAnswer.class, answer -> summaryOf(allocation, answer));
            case ScalesContent scales -> fromSummaries(parentAnswers,
                    ScalesAnswer.class, answer -> summaryOf(scales, answer));
            case AxisContent axis -> fromSummaries(parentAnswers,
                    AxisAnswer.class, answer -> summaryOf(axis, answer));
            case PlaceOnImageContent place -> fromSummaries(parentAnswers,
                    PlaceOnImageAnswer.class, answer -> summaryOf(place, answer));
            // A follow-up parent (rejected at authoring) or a non-scorable kind.
            default -> FollowUpOptionSet.empty();
        };
    }

    /** The authored choices verbatim — same ids, same order, no submitters. */
    private static FollowUpOptionSet fromMcq(McqContent mcq, Function<AppImage, String> imageUrl) {
        List<McqOption> authored = mcq.options();
        if (authored == null || authored.isEmpty()) {
            return FollowUpOptionSet.empty();
        }
        List<FollowUpOption> options = new ArrayList<>(authored.size());
        for (McqOption option : authored) {
            options.add(new FollowUpOption(
                    option.id(),
                    option.text(),
                    option.image() == null ? null : imageUrl.apply(option.image()),
                    Set.of(),
                    false));
        }
        return new FollowUpOptionSet(List.copyOf(options));
    }

    /**
     * The submitted texts, merged on their normalized form. The first submission
     * of a group (answers are walked in submission order) fixes both the display
     * text — the raw wording its author typed, not the normalized key — and the
     * group's position on the board. On a {@link FollowUpMode#SPOT_THE_ANSWER}
     * follow-up the parent's authored answer joins them (see
     * {@link #withAuthoredAnswer}) and the finished board is shuffled (see
     * {@link #finishShuffled}) — the one mint that does not lay its cards out in
     * submission order.
     */
    private static FollowUpOptionSet fromText(TextContent content, List<Answer> answers, FollowUpMode mode,
            BoardShuffler boardShuffler) {
        Map<String, Candidate> byNormalized = new LinkedHashMap<>();
        for (Answer answer : inSubmissionOrder(answers)) {
            if (!(answer.getPayload() instanceof TextAnswer text)) {
                continue;
            }
            String raw = text.text();
            if (raw == null || raw.isBlank()) {
                continue;
            }
            byNormalized.computeIfAbsent(content.normalize(raw), _ -> new Candidate(raw, null))
                    .addAuthor(answer.getParticipantId());
        }
        if (mode != FollowUpMode.SPOT_THE_ANSWER) {
            return finish(byNormalized);
        }
        return finishShuffled(withAuthoredAnswer(content, byNormalized), boardShuffler);
    }

    /**
     * The submissions with the parent's authored answer mixed in, for the one
     * mode that hides the answer key on the board — appended to the caller's own
     * map in place, since the caller has just built it and hands it straight on
     * to {@link #finishShuffled}.
     *
     * <p><strong>Which wording.</strong> An answer key is a <em>set</em> of
     * accepted answers, but only one card can stand for it, so the first
     * non-blank entry in the set's iteration order is the representative. That
     * order is fixed for a given stored slide (Jackson and MongoDB both hydrate
     * a {@code Set} field as a {@code LinkedHashSet}, so it is the authored
     * order), and a live session mints from one immutable deck snapshot — so
     * every re-mint of a round reads the same wording, which is what keeps the
     * seeded card's <em>id</em> stable. It is <strong>stripped first</strong>
     * and the stripped form is what both the card shows and
     * {@link TextContent#normalize normalizes} into the key — so the seed obeys
     * the same {@code optionId == derivedId(normalize(displayText))} relation
     * every submission card does. Deriving the key from the raw wording instead
     * would break that relation on a {@code trimWhitespace = false} parent with
     * a padded accepted answer, leaving the seed as the one card on the board
     * whose id doesn't match its text — a tell as good as a label. The corner
     * that buys: on such a parent a participant who typed the <em>unpadded</em>
     * wording graded <em>incorrect</em> on the parent round and still merges
     * into the seed card here, since both key off the stripped form — accepted,
     * because a seed that reads as an ordinary card matters more on this board
     * than the parent's padding does.
     *
     * <p><strong>Merging.</strong> Keying it like a submission is the point: a
     * participant who typed the authored answer lands on the same key, so the
     * two become <em>one</em> card that is both the authored answer and theirs.
     * It keeps the flag and gains them as authors — which also means the
     * self-pick {@code 409} correctly stops them picking the card they wrote.
     *
     * <p><strong>Where it lands.</strong> Nowhere in particular, and that is
     * the whole design: the seed is simply appended after the last submission
     * here, and {@link #finishShuffled} then reorders the entire board, so no
     * position on a {@code SPOT_THE_ANSWER} board carries information. A merged
     * seed needs no special handling for the same reason — once every card is
     * shuffled there is no position left that could be special.
     *
     * <p><strong>Degradation.</strong> A parent whose answer key was emptied
     * after the follow-up was attached seeds nothing and mints exactly as
     * {@code BEST_ANSWER_VOTE} would. No candidate carries the flag, so no pick
     * can grade correct and the <em>picker</em> side scores nobody; the author
     * side is unaffected — {@code RoundEvaluator.followUpPicksByAuthor} gates on
     * the mode and a non-empty board, not on the flag, so cards that drew picks
     * still pay their authors deception points.
     */
    private static Map<String, Candidate> withAuthoredAnswer(TextContent content,
            Map<String, Candidate> byNormalized) {
        String authored = representativeAnswer(content);
        if (authored == null) {
            return byNormalized;
        }
        // Strip before keying, not after: the card's display text is the stripped
        // wording, and its id has to be the derivation of that same text.
        String display = authored.strip();
        String key = content.normalize(display);
        if (key == null || key.isEmpty()) {
            return byNormalized;
        }
        Candidate merged = byNormalized.get(key);
        if (merged != null) {
            merged.markAuthoredAnswer();
            return byNormalized;
        }
        Candidate seed = new Candidate(display, null);
        seed.markAuthoredAnswer();
        byNormalized.put(key, seed);
        return byNormalized;
    }

    /**
     * The accepted answer that stands for the whole key on the board: the first
     * non-blank one in iteration order, or {@code null} when the parent carries
     * no answer key at all.
     */
    private static String representativeAnswer(TextContent content) {
        Set<String> accepted = content.acceptedAnswers();
        if (accepted == null) {
            return null;
        }
        for (String candidate : accepted) {
            if (candidate != null && !candidate.isBlank()) {
                return candidate;
            }
        }
        return null;
    }

    /**
     * One candidate per submitted drawing, keyed on the image's stored key so a
     * re-mint reproduces the id. An image with no stored key (never ingested) has
     * nothing stable to hash and is skipped, rather than given a random id a
     * restart would change. On a {@link FollowUpMode#SPOT_THE_ANSWER} follow-up
     * the parent's authored {@code correctImage} joins them (see
     * {@link #withAuthoredImage}) and the finished board is shuffled (see
     * {@link #finishShuffled}) — the image twin of {@link #fromText}.
     */
    private static FollowUpOptionSet fromDrawings(DrawingContent content, List<Answer> answers,
            FollowUpMode mode, Function<AppImage, String> imageUrl, BoardShuffler boardShuffler) {
        Map<String, Candidate> bySrcKey = new LinkedHashMap<>();
        for (Answer answer : inSubmissionOrder(answers)) {
            if (!(answer.getPayload() instanceof DrawingAnswer drawing) || drawing.image() == null) {
                continue;
            }
            AppImage image = drawing.image();
            String srcKey = image.getSrcKey();
            if (srcKey == null) {
                continue;
            }
            bySrcKey.computeIfAbsent(srcKey, _ -> new Candidate(null, imageUrl.apply(image)))
                    .addAuthor(answer.getParticipantId());
        }
        if (mode != FollowUpMode.SPOT_THE_ANSWER) {
            return finish(bySrcKey);
        }
        return finishShuffled(withAuthoredImage(content, bySrcKey, imageUrl), boardShuffler);
    }

    /**
     * The submitted drawings with the parent's own authored answer picture mixed
     * in — {@link #withAuthoredAnswer}'s twin for an image parent, and keyed the
     * same way a submission is: on the image's stored {@code srcKey}, so the seed
     * gets the same {@code derivedId(srcKey)} relation every submitted card has
     * and a re-mint reproduces its id. Its display URL is resolved through the
     * same {@code imageUrl} function the submissions go through, so it leaves as
     * an opaque proxy URL like every other candidate — a presigned URL would
     * spell out its {@code gallery/…} key and hand the answer to anyone with
     * devtools open, which is exactly as fatal as an unshuffled board.
     *
     * <p><strong>Merging.</strong> Handled for symmetry with the text seed, but
     * structurally unreachable today: {@code LiveSessionAnswerService.validateDrawing}
     * only accepts a submission whose key sits under
     * {@code drawing/{sessionId}/{participantId}/}, while an authored image is a
     * gallery object ({@code gallery/…}), so no participant can submit a drawing
     * that keys onto the seed. The {@code computeIfAbsent} merge is kept anyway
     * rather than a bare {@code put}, so the day those namespaces can meet the
     * seed gains the submitters as authors instead of silently discarding them —
     * the same card being both the answer and someone's submission, exactly as
     * on TEXT.
     *
     * <p><strong>Degradation.</strong> A parent with no {@code correctImage} —
     * or one pointing at an external URL, or one holding no renderable variant —
     * seeds nothing and mints exactly the {@code BEST_ANSWER_VOTE} board (the
     * editor rejects clearing it under an attached child, but a session's deck
     * snapshot can predate that rule). No candidate carries the flag, so no pick
     * grades correct and the <em>picker</em> side scores nobody; the author side
     * is unaffected, for the reason spelled out on {@link #withAuthoredAnswer}.
     */
    private static Map<String, Candidate> withAuthoredImage(DrawingContent content,
            Map<String, Candidate> bySrcKey, Function<AppImage, String> imageUrl) {
        AppImage authored = content.correctImage();
        if (authored == null || authored.isExternal()) {
            return bySrcKey;
        }
        String srcKey = authored.getSrcKey();
        if (srcKey == null || srcKey.isBlank()) {
            return bySrcKey;
        }
        String url = imageUrl.apply(authored);
        if (url == null || url.isBlank()) {
            return bySrcKey;
        }
        bySrcKey.computeIfAbsent(srcKey, _ -> new Candidate(null, url)).markAuthoredAnswer();
        return bySrcKey;
    }

    /**
     * One candidate per distinct rendered summary — the shared shape of every
     * structured parent kind. The summary is both the display text and the dedup
     * key, so it doubles as what {@link #derivedId} hashes: two participants whose
     * submissions render the same line get one card owning both of them, and a
     * submission that renders nothing (empty payload, or one referencing only
     * items the content no longer has) is dropped rather than shown blank.
     *
     * @param payloadType the payload the parent's kind produces — an answer of any
     *                    other type is a content/answer mismatch and is skipped
     * @param summarize   renders one submission, or {@code null} for nothing to show
     */
    private static <P extends AnswerPayload> FollowUpOptionSet fromSummaries(List<Answer> answers,
            Class<P> payloadType, Function<P, String> summarize) {
        Map<String, Candidate> bySummary = new LinkedHashMap<>();
        for (Answer answer : inSubmissionOrder(answers)) {
            AnswerPayload payload = answer.getPayload();
            if (!payloadType.isInstance(payload)) {
                continue;
            }
            String summary = summarize.apply(payloadType.cast(payload));
            if (summary == null || summary.isBlank()) {
                continue;
            }
            String key = summary.strip();
            bySummary.computeIfAbsent(key, _ -> new Candidate(key, null))
                    .addAuthor(answer.getParticipantId());
        }
        return finish(bySummary);
    }

    /**
     * The answers in the order the board lays them out: when they were submitted,
     * and — so two mints of one round can't disagree on same-instant submissions
     * — the participant id as the tiebreak. An answer missing either field sorts
     * last rather than failing the mint.
     */
    private static List<Answer> inSubmissionOrder(List<Answer> answers) {
        List<Answer> ordered = new ArrayList<>(answers);
        ordered.sort(Comparator
                .comparing((Answer answer) -> answer.getSubmittedAt(),
                        Comparator.nullsLast(Comparator.<Instant>naturalOrder()))
                .thenComparing(answer -> answer.getParticipantId(),
                        Comparator.nullsLast(Comparator.<String>naturalOrder())));
        return ordered;
    }

    /** The board in the order the candidates were keyed — authored or submission order. */
    private static FollowUpOptionSet finish(Map<String, Candidate> byKey) {
        return new FollowUpOptionSet(List.copyOf(mintedFrom(byKey)));
    }

    /**
     * The board in an order drawn fresh from {@link SecureRandom} — how a
     * {@link FollowUpMode#SPOT_THE_ANSWER} round's cards reach the wire, and the
     * only mint that does not lay them out in a derived order.
     *
     * <p><strong>Why the whole list, not one hidden slot.</strong> The seed has
     * to be positionally anonymous, and dropping it into a random slot among
     * submissions that keep their submission order is not enough: two mints of
     * one unchanged round then differ in exactly <em>one</em> card's index, so a
     * participant holding arrangement A (the live board) beside arrangement B (a
     * snapshot refetched after a reconnect or reload, or the board a re-open
     * republishes) reads the seed straight off the diff — the single card that
     * moved — with probability {@code n/(n+1)}. Shuffling everything makes the
     * two arrangements independent permutations, so movement distinguishes
     * nothing: every card moves, and the seed no more than the rest.
     *
     * <p><strong>Why random rather than derived.</strong> Everything a
     * derivation could be a function of — each card's text and its index —
     * travels to every client on {@code FollowUpOptionView}, so a client could
     * recompute it per card and see which one lands where it "should". A draw
     * consumes no board-visible input, so there is nothing to recompute; and it
     * is the CSPRNG rather than {@code java.util.Random} because a predictable
     * stream would hand the same answer back to anyone who could observe a few
     * boards.
     *
     * <p><strong>What it costs.</strong> Only that two mints of one round may
     * arrange the board differently, which nothing depends on: candidate
     * <em>ids</em> stay content-derived and everything — a pick, a tally, the
     * grading — addresses a card by id, never by position. The arrangement every
     * device shares is the one snapshotted when the round opened
     * ({@code FollowUpOptionStore}); a re-mint happens only where that round's
     * cast answers are cleared with it (see {@code LiveSessionOrchestrator}'s
     * open/restart path), and it stamps a fresh {@code roundStartedAt}, on which
     * already-connected clients re-key their snapshot refetch and so converge on
     * the new arrangement.
     *
     * <p>It has a second effect worth keeping: a shuffled board no longer leaks
     * the <em>order the parent round's answers arrived in</em>, which every
     * other mode's board does carry.
     */
    private static FollowUpOptionSet finishShuffled(Map<String, Candidate> byKey, BoardShuffler boardShuffler) {
        List<FollowUpOption> options = mintedFrom(byKey);
        boardShuffler.shuffle(options);
        return new FollowUpOptionSet(List.copyOf(options));
    }

    @FunctionalInterface
    interface BoardShuffler {
        void shuffle(List<FollowUpOption> options);
    }

    /** The keyed candidates as options, in the map's own order — mutable, for the caller to arrange. */
    private static List<FollowUpOption> mintedFrom(Map<String, Candidate> byKey) {
        List<FollowUpOption> options = new ArrayList<>(byKey.size());
        byKey.forEach((key, candidate) -> options.add(candidate.toOption(key)));
        return options;
    }

    /** A UUID hashed from the content the option stands for — same input, same id. */
    private static String derivedId(String content) {
        return UUID.nameUUIDFromBytes(content.getBytes(UTF_8)).toString();
    }

    // ── Summaries of a structured submission ──────────────────────────────────

    /** The submitted number, trailing zeros trimmed, with the slide's unit when it has one. */
    private static String summaryOf(NumberContent content, NumberAnswer answer) {
        String value = plain(answer.value());
        if (value == null) {
            return null;
        }
        String unit = content.unit();
        return unit == null || unit.isBlank() ? value : value + " " + unit.strip();
    }

    /** The ranked item labels in the submitted order, e.g. {@code "Alpha > Beta > Gamma"}. */
    private static String summaryOf(RankingContent content, RankingAnswer answer) {
        List<String> ordered = answer.orderedItemIds();
        if (ordered == null) {
            return null;
        }
        Map<String, String> labels = labelsOf(content.items(), item -> item.id(), item -> item.label());
        List<String> parts = new ArrayList<>(ordered.size());
        for (String itemId : ordered) {
            String label = labels.get(itemId);
            if (label != null) {
                parts.add(label);
            }
        }
        return join(parts, RANK_SEPARATOR);
    }

    /** The submitted pairs in the left column's authored order, e.g. {@code "Alpha ↔ X · Beta ↔ Y"}. */
    private static String summaryOf(MatchingContent content, MatchingAnswer answer) {
        Map<String, String> matches = answer.matches();
        if (matches == null) {
            return null;
        }
        Map<String, String> rightLabels = labelsOf(content.right(), item -> item.id(), item -> item.label());
        List<String> parts = new ArrayList<>();
        labelsOf(content.left(), item -> item.id(), item -> item.label()).forEach((leftId, leftLabel) -> {
            String rightLabel = rightLabels.get(matches.get(leftId));
            if (rightLabel != null) {
                parts.add(leftLabel + PAIR_SEPARATOR + rightLabel);
            }
        });
        return join(parts, PART_SEPARATOR);
    }

    /** Where each item was dropped, by cell label, e.g. {@code "Alpha → Mammal/Africa"}. */
    private static String summaryOf(GridContent content, GridAnswer answer) {
        Map<String, String> placements = answer.placements();
        if (placements == null) {
            return null;
        }
        List<String> parts = new ArrayList<>();
        labelsOf(content.items(), item -> item.id(), item -> item.label()).forEach((itemId, itemLabel) -> {
            String cell = cellLabel(content, placements.get(itemId));
            if (cell != null) {
                parts.add(itemLabel + PLACED_AT + cell);
            }
        });
        return join(parts, PART_SEPARATOR);
    }

    /**
     * The points put on each option, e.g. {@code "Alpha 60 · Beta 40"} — points out
     * of the slide's {@code totalPointsToAllocate}, not percentages. An option left
     * at zero is omitted, so "all on Alpha" reads the same whether the other
     * options were submitted as explicit zeroes or not at all.
     */
    private static String summaryOf(AllocationContent content, AllocationAnswer answer) {
        Map<String, Integer> allocations = answer.allocations();
        if (allocations == null) {
            return null;
        }
        List<String> parts = new ArrayList<>();
        labelsOf(content.options(), option -> option.id(), option -> option.text())
                .forEach((optionId, optionLabel) -> {
                    Integer allocated = allocations.get(optionId);
                    if (allocated != null && allocated != 0) {
                        parts.add(optionLabel + " " + allocated);
                    }
                });
        return join(parts, PART_SEPARATOR);
    }

    /**
     * Each statement and where its marker landed, in scale units rather than the
     * normalized position the payload carries, e.g. {@code "Cost 7.5 · Risk 3"}.
     */
    private static String summaryOf(ScalesContent content, ScalesAnswer answer) {
        Map<String, Double> positions = answer.positions();
        if (positions == null) {
            return null;
        }
        double span = content.max() - content.min();
        List<String> parts = new ArrayList<>();
        labelsOf(content.items(), item -> item.id(), item -> item.label()).forEach((itemId, itemLabel) -> {
            Double position = positions.get(itemId);
            String value = position == null ? null : rounded(content.min() + position * span);
            if (value != null) {
                parts.add(itemLabel + " " + value);
            }
        });
        return join(parts, PART_SEPARATOR);
    }

    /**
     * Each item's spot on the plane as whole percentages of each axis, e.g.
     * {@code "Alpha (30%, 70%)"}. Percentages rather than the axes' end labels:
     * a placement is a point <em>between</em> the ends, and rounding to whole
     * percent is also the dedup grain — two placements a pixel apart read as the
     * same answer and share one candidate.
     */
    private static String summaryOf(AxisContent content, AxisAnswer answer) {
        Map<String, AxisPoint> placements = answer.placements();
        if (placements == null) {
            return null;
        }
        List<String> parts = new ArrayList<>();
        labelsOf(content.items(), item -> item.id(), item -> item.label()).forEach((itemId, itemLabel) -> {
            AxisPoint point = placements.get(itemId);
            String at = point == null ? null : coordinates(point.x(), point.y());
            if (at != null) {
                parts.add(itemLabel + " " + at);
            }
        });
        return join(parts, PART_SEPARATOR);
    }

    /**
     * Each pin's spot on the image as whole percentages, in the same shape as
     * {@code AxisContent}'s. The image itself never travels — a candidate minted
     * here is text only, so the board shows where the pins went, not the picture
     * they went on.
     */
    private static String summaryOf(PlaceOnImageContent content, PlaceOnImageAnswer answer) {
        Map<String, PlacePoint> placements = answer.placements();
        if (placements == null) {
            return null;
        }
        List<String> parts = new ArrayList<>();
        labelsOf(content.items(), item -> item.id(), item -> item.label())
                .forEach((itemId, itemLabel) -> {
                    PlacePoint point = placements.get(itemId);
                    String at = point == null ? null : coordinates(point.x(), point.y());
                    if (at != null) {
                        parts.add(itemLabel + " " + at);
                    }
                });
        return join(parts, PART_SEPARATOR);
    }

    /**
     * The parent's placeable items as id → display label, in authored order — so
     * iterating this map both fixes the summary's part order (a {@code Map} payload
     * has none) and drops answer entries for items the content no longer has.
     * An item authored without a label falls back to its 1-based authored position
     * ({@code "#2"}) rather than exposing its id, which is meaningless to a voter.
     */
    private static <T> Map<String, String> labelsOf(List<T> items,
            Function<T, String> id, Function<T, String> label) {
        Map<String, String> labels = new LinkedHashMap<>();
        if (items == null) {
            return labels;
        }
        for (int position = 0; position < items.size(); position++) {
            T item = items.get(position);
            if (item == null) {
                continue;
            }
            String itemId = id.apply(item);
            if (itemId == null || itemId.isBlank()) {
                continue;
            }
            String text = label.apply(item);
            labels.putIfAbsent(itemId,
                    text == null || text.isBlank() ? "#" + (position + 1) : text.strip());
        }
        return labels;
    }

    /**
     * A grid cell's {@code "rowIndex,colIndex"} id rendered from the slide's own
     * axis labels. Null for anything unrenderable — an unparseable or
     * out-of-bounds cell (the grid was resized after the answer landed), or a cell
     * whose row and column are both unlabelled.
     */
    private static String cellLabel(GridContent content, String cell) {
        if (cell == null) {
            return null;
        }
        int comma = cell.indexOf(',');
        if (comma < 0) {
            return null;
        }
        String row = labelAt(content.rowLabels(), cell.substring(0, comma));
        String column = labelAt(content.colLabels(), cell.substring(comma + 1));
        if (row == null && column == null) {
            return null;
        }
        if (row == null) {
            return column;
        }
        return column == null ? row : row + CELL_SEPARATOR + column;
    }

    /** The label at {@code index} of a grid axis, or null when absent, blank, or out of range. */
    private static String labelAt(List<String> labels, String index) {
        if (labels == null) {
            return null;
        }
        int at;
        try {
            at = Integer.parseInt(index.strip());
        } catch (NumberFormatException _) {
            return null;
        }
        if (at < 0 || at >= labels.size()) {
            return null;
        }
        String label = labels.get(at);
        return label == null || label.isBlank() ? null : label.strip();
    }

    /** A normalized point as whole percentages, e.g. {@code "(30%, 70%)"}. */
    private static String coordinates(double normalizedX, double normalizedY) {
        if (!Double.isFinite(normalizedX) || !Double.isFinite(normalizedY)) {
            return null;
        }
        return "(" + Math.round(normalizedX * 100) + "%, " + Math.round(normalizedY * 100) + "%)";
    }

    /** A scale value at display precision, trailing zeros trimmed ({@code "7.5"}, {@code "3"}). */
    private static String rounded(double value) {
        if (!Double.isFinite(value)) {
            return null;
        }
        return BigDecimal.valueOf(value)
                .setScale(SCALE_DECIMALS, RoundingMode.HALF_UP)
                .stripTrailingZeros()
                .toPlainString();
    }

    /** A submitted number with no exponent and no trailing zeros ({@code "42.5"}, {@code "42"}). */
    private static String plain(double value) {
        if (!Double.isFinite(value)) {
            return null;
        }
        return BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
    }

    /** The parts as one summary line, or null when nothing was renderable. */
    private static String join(List<String> parts, String separator) {
        return parts.isEmpty() ? null : String.join(separator, parts);
    }

    /**
     * One candidate under construction: its display fields are fixed by the first
     * submission that lands on the key, while later matching submissions only add
     * their author. Mutable, so it stays inside this class — the minted
     * {@link FollowUpOption} it hands back is immutable.
     */
    private static final class Candidate {

        private final String text;
        private final String imageUrl;
        private final Set<String> authors = new LinkedHashSet<>();
        private boolean authoredAnswer;

        private Candidate(String text, String imageUrl) {
            this.text = text;
            this.imageUrl = imageUrl;
        }

        private void addAuthor(String participantId) {
            if (participantId != null) {
                authors.add(participantId);
            }
        }

        /**
         * Marks this the parent's authored answer. Set on the seeded candidate,
         * or on the submission it merged with — a card can be both, and stays
         * both: the flag is never cleared by a later submission joining it.
         */
        private void markAuthoredAnswer() {
            this.authoredAnswer = true;
        }

        private FollowUpOption toOption(String key) {
            return new FollowUpOption(derivedId(key), text, imageUrl, Set.copyOf(authors), authoredAnswer);
        }
    }
}
