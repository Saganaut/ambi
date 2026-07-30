package com.cephadex.ambi.session.followUp;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
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
 * resolver.
 *
 * <p>
 * <strong>Ids are derived, never random.</strong> Every option id is a UUID
 * hashed from the content it stands for (the authored option id for MCQ, the
 * normalized text for TEXT, the stored image key for DRAWING, the rendered
 * summary for the structured kinds), so re-minting over the same submissions
 * reproduces the same set — a restarted round keeps the votes already cast
 * against it meaningful instead of orphaning them. Ordering is derived the same
 * way: authored order for MCQ, and submission order ({@code submittedAt}, ties
 * broken by participant id) for the kinds minted from answers, so two mints of
 * one round also agree on the layout.
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
     * the display text;</li>
     * <li><strong>DRAWING parent</strong> — one candidate per submitted image
     * (an answer that never produced one is skipped);</li>
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
     * @param imageUrl      resolves a stored image to a URL the board can render
     *                      (the caller passes the presigner at the size it
     *                      projects at); may return {@code null}
     */
    public static FollowUpOptionSet mint(Slide parent, List<Answer> parentAnswers,
            Function<AppImage, String> imageUrl) {
        Objects.requireNonNull(parentAnswers, "parentAnswers required");
        Objects.requireNonNull(imageUrl, "imageUrl required");
        if (parent == null) {
            return FollowUpOptionSet.empty();
        }
        return switch (parent.getContent()) {
            case McqContent mcq -> fromMcq(mcq, imageUrl);
            case TextContent text -> fromText(text, parentAnswers);
            case DrawingContent _ -> fromDrawings(parentAnswers, imageUrl);
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
                    Set.of()));
        }
        return new FollowUpOptionSet(List.copyOf(options));
    }

    /**
     * The submitted texts, merged on their normalized form. The first submission
     * of a group (answers are walked in submission order) fixes both the display
     * text — the raw wording its author typed, not the normalized key — and the
     * group's position on the board.
     */
    private static FollowUpOptionSet fromText(TextContent content, List<Answer> answers) {
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
        return finish(byNormalized);
    }

    /**
     * One candidate per submitted drawing, keyed on the image's stored key so a
     * re-mint reproduces the id. An image with no stored key (never ingested) has
     * nothing stable to hash and is skipped, rather than given a random id a
     * restart would change.
     */
    private static FollowUpOptionSet fromDrawings(List<Answer> answers, Function<AppImage, String> imageUrl) {
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
        return finish(bySrcKey);
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

    private static FollowUpOptionSet finish(Map<String, Candidate> byKey) {
        List<FollowUpOption> options = new ArrayList<>(byKey.size());
        byKey.forEach((key, candidate) -> options.add(candidate.toOption(key)));
        return new FollowUpOptionSet(List.copyOf(options));
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
        labelsOf(content.correctTargets(), target -> target.id(), target -> target.label())
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
    private static String coordinates(double x, double y) {
        if (!Double.isFinite(x) || !Double.isFinite(y)) {
            return null;
        }
        return "(" + Math.round(x * 100) + "%, " + Math.round(y * 100) + "%)";
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

        private Candidate(String text, String imageUrl) {
            this.text = text;
            this.imageUrl = imageUrl;
        }

        private void addAuthor(String participantId) {
            if (participantId != null) {
                authors.add(participantId);
            }
        }

        private FollowUpOption toOption(String key) {
            return new FollowUpOption(derivedId(key), text, imageUrl, Set.copyOf(authors));
        }
    }
}
