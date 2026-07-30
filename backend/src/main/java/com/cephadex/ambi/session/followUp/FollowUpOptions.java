package com.cephadex.ambi.session.followUp;

import static java.nio.charset.StandardCharsets.UTF_8;

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
import com.cephadex.ambi.presentation.slide.content.DrawingContent;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.TextContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.DrawingAnswer;
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
 * normalized text for TEXT, the stored image key for DRAWING), so re-minting
 * over the same submissions reproduces the same set — a restarted round keeps
 * the votes already cast against it meaningful instead of orphaning them.
 * Ordering is derived the same way: authored order for MCQ, and submission
 * order ({@code submittedAt}, ties broken by participant id) for the kinds
 * minted from answers, so two mints of one round also agree on the layout.
 */
public final class FollowUpOptions {

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
     * <li><strong>anything else</strong>, or no parent at all — nothing to vote
     * on, so the set is empty.</li>
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
