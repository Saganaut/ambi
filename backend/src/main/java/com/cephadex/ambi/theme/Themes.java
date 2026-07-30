package com.cephadex.ambi.theme;

import java.util.Set;

/**
 * The reserved theme ids that name the app's two built-in looks, "Ambi Light"
 * and "Ambi Dark".
 *
 * <p>These are values {@code Deck.themeId} may hold, but they are
 * <em>never</em> rows in the {@code themes} collection: the client
 * resolves them entirely from {@code frontend/src/tokens.css}, so no lookup
 * against {@link ThemeRepository} will ever — or should ever — find them. Every
 * real theme id is a client-minted UUID, so the two namespaces cannot collide;
 * {@link ThemeService#create} rejects an attempt to mint a theme on one of
 * these ids.
 *
 * <p>Mirrored by {@code frontend/src/features/theme/defaultThemes.ts} — keep
 * the ids in sync.
 */
public final class Themes {

    private Themes() {
    }

    /** The light brand default, painted by the {@code tokens.css} light block. */
    public static final String DEFAULT_LIGHT_ID = "ambi-light";

    /** The dark brand default, painted by the {@code tokens.css} dark block. */
    public static final String DEFAULT_DARK_ID = "ambi-dark";

    private static final Set<String> RESERVED_IDS = Set.of(DEFAULT_LIGHT_ID, DEFAULT_DARK_ID);

    /** Whether {@code id} names a client-side default rather than a stored theme. */
    public static boolean isReservedId(String id) {
        return id != null && RESERVED_IDS.contains(id);
    }
}
