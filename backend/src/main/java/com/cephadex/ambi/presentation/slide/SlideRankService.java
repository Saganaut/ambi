package com.cephadex.ambi.presentation.slide;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Component;

import com.github.pravin.raha.lexorank4j.LexoRank;

/**
 * Computes the {@code sortOrder} keys that order a deck's slides, wrapping the
 * lexorank4j library so the rest of the domain never imports {@link LexoRank}
 * directly. The keys are LexoRank strings: they sort correctly under plain
 * {@link String} natural ordering, and a key can always be generated
 * <em>between</em> two neighbours, so inserting or moving one slide only rewrites
 * that slide's key — the rest of the list is untouched.
 *
 * <p>All keys share the default LexoRank bucket, which is what lets
 * {@link #between(String, String)} work across any two of them. The wrapper is
 * stateless and side-effect free; a singleton {@code @Component}.
 */
@Component
public class SlideRankService {

    /**
     * Orders slides by their {@code sortOrder} key. Slides without a key (legacy
     * data not yet backfilled) sort last, and ties break on {@code id} so the
     * order is always total and deterministic.
     */
    public static Comparator<Slide> ordering() {
        return Comparator
                .comparing((Slide s) -> s.getSortOrder(),
                        Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(s -> s.getId(),
                        Comparator.nullsLast(Comparator.naturalOrder()));
    }

    /** The first key for an otherwise empty list. */
    public String initial() {
        return LexoRank.middle().format();
    }

    /**
     * A key strictly after {@code maxRank} — i.e. for appending past the current
     * last slide. Returns {@link #initial()} when the list is empty
     * ({@code maxRank} is {@code null}).
     */
    public String after(String maxRank) {
        if (maxRank == null) {
            return initial();
        }
        return LexoRank.parse(maxRank).genNext().format();
    }

    /**
     * A key strictly before {@code minRank} — i.e. for prepending ahead of the
     * current first slide. Returns {@link #initial()} when the list is empty
     * ({@code minRank} is {@code null}).
     */
    public String before(String minRank) {
        if (minRank == null) {
            return initial();
        }
        return LexoRank.parse(minRank).genPrev().format();
    }

    /**
     * A key strictly between two existing keys. Callers must ensure a gap exists
     * first via {@link #hasGap(String, String)}; {@code between} of two equal keys
     * has no well-defined midpoint.
     *
     * @param lower the neighbour the new key must sort after
     * @param upper the neighbour the new key must sort before
     */
    public String between(String lower, String upper) {
        return LexoRank.parse(lower).between(LexoRank.parse(upper)).format();
    }

    /**
     * Whether a key can be placed between {@code lower} and {@code upper} — true
     * only when both exist and {@code lower} sorts strictly before {@code upper}.
     * lexorank4j lengthens keys as needed, so in practice this is false only for
     * equal or out-of-order keys (e.g. duplicate legacy ranks), which signals the
     * list should be rebalanced via {@link #evenlySpaced(int)} before retrying.
     */
    public boolean hasGap(String lower, String upper) {
        if (lower == null || upper == null) {
            return false;
        }
        return LexoRank.parse(lower).compareTo(LexoRank.parse(upper)) < 0;
    }

    /**
     * {@code count} strictly-ascending keys, evenly stepped. Used to assign a
     * whole list at once: backfilling slides that have no key yet, or rebalancing
     * a list whose keys have collided.
     *
     * @param count how many keys to generate (0 yields an empty list)
     */
    public List<String> evenlySpaced(int count) {
        List<String> ranks = new ArrayList<>(count);
        LexoRank cursor = LexoRank.middle();
        for (int i = 0; i < count; i++) {
            ranks.add(cursor.format());
            cursor = cursor.genNext();
        }
        return ranks;
    }
}
