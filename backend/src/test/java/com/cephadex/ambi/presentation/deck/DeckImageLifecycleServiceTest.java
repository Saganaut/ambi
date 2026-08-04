package com.cephadex.ambi.presentation.deck;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.Collection;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.cephadex.ambi.media.storage.ImageKeys;
import com.cephadex.ambi.media.storage.S3StorageService;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
import com.cephadex.ambi.presentation.slide.enums.McqOptionType;

/**
 * The copy-on-select lifecycle: adoption copies a placed image's objects under
 * the deck's own prefix and rewrites the embedded {@link AppImage} in place
 * (external / blank / already-owned images untouched); cleanup frees exactly
 * the deck-owned keys a save removed — never shared gallery keys — and both
 * delete paths are best-effort.
 */
class DeckImageLifecycleServiceTest {

    private S3StorageService storage;
    private DeckImageLifecycleService lifecycle;

    @BeforeEach
    void setUp() {
        storage = mock(S3StorageService.class);
        lifecycle = new DeckImageLifecycleService(storage);
    }

    // ── Adoption ────────────────────────────────────────────────────────────────

    @Test
    void adoptImageCopiesOriginalAndVariantsAndRewritesTheImageInPlace() {
        AppImage image = galleryImage("gallery/abc");

        lifecycle.adoptImage("deck-1", image);

        assertThat(image.getSrcKey()).startsWith("deck/deck-1/").endsWith("/original");
        String prefix = ImageKeys.prefixOf(image.getSrcKey());
        assertThat(image.getVariants()).containsOnly(
                Map.entry(ImageSizeOptions.SM, prefix + "/sm.webp"),
                Map.entry(ImageSizeOptions.LG, prefix + "/lg.webp"));
        verify(storage).copyIfExists("gallery/abc/original", image.getSrcKey());
        verify(storage).copyIfExists("gallery/abc/sm.webp", prefix + "/sm.webp");
        verify(storage).copyIfExists("gallery/abc/lg.webp", prefix + "/lg.webp");
    }

    @Test
    void adoptImageWithoutVariantsCopiesOnlyTheOriginal() {
        // The AVIF shape: a stored original and an empty variants map.
        AppImage image = new AppImage();
        image.setExternal(false);
        image.setSrcKey("gallery/avif/original");
        image.setVariants(new EnumMap<>(ImageSizeOptions.class));

        lifecycle.adoptImage("deck-1", image);

        assertThat(image.getSrcKey()).startsWith("deck/deck-1/");
        assertThat(image.getVariants()).isEmpty();
        verify(storage).copyIfExists(eq("gallery/avif/original"), anyString());
    }

    @Test
    void adoptImageSkipsExternalBlankAndAlreadyOwnedImages() {
        AppImage external = new AppImage();
        external.setExternal(true);
        external.setExternalSrc("https://example.com/cat.png");
        AppImage blank = new AppImage();
        blank.setExternal(false);
        AppImage owned = new AppImage();
        owned.setExternal(false);
        owned.setSrcKey("deck/deck-1/abc/original");

        lifecycle.adoptImage("deck-1", external);
        lifecycle.adoptImage("deck-1", blank);
        lifecycle.adoptImage("deck-1", owned);
        lifecycle.adoptImage("deck-1", null);

        assertThat(owned.getSrcKey()).isEqualTo("deck/deck-1/abc/original");
        verifyNoInteractions(storage);
    }

    @Test
    void adoptImagesWalksEveryEmbeddedImageOfTheDeck() {
        Deck deck = new Deck();
        deck.setId("deck-1");
        AppImage cover = galleryImage("gallery/cover");
        deck.setCoverImage(cover);
        Slide slide = new Slide();
        slide.setId("s1");
        AppImage option = galleryImage("gallery/option");
        slide.setContent(new McqContent(
                List.of(new McqOption("o1", McqOptionType.IMAGE, null, option, null)),
                Set.of(), SlideContentTypes.McqDataVisualization.NONE));
        deck.getSlides().add(slide);

        lifecycle.adoptImages(deck);

        assertThat(cover.getSrcKey()).startsWith("deck/deck-1/");
        assertThat(option.getSrcKey()).startsWith("deck/deck-1/");
        // Each placement gets its own prefix, so freeing one never breaks another.
        assertThat(ImageKeys.prefixOf(cover.getSrcKey()))
                .isNotEqualTo(ImageKeys.prefixOf(option.getSrcKey()));
    }

    // ── Cleanup ─────────────────────────────────────────────────────────────────

    @Test
    void cleanupRemovedDeletesOnlyRemovedDeckOwnedKeys() {
        Set<String> before = new LinkedHashSet<>(List.of(
                "deck/deck-1/a/original", "deck/deck-1/a/sm.webp",
                "gallery/shared/original",
                "deck/deck-1/b/original"));
        Set<String> after = Set.of("deck/deck-1/b/original");

        lifecycle.cleanupRemoved("deck-1", before, after);

        ArgumentCaptor<Collection<String>> deleted = ArgumentCaptor.forClass(Collection.class);
        verify(storage).delete(deleted.capture());
        assertThat(deleted.getValue())
                .containsExactlyInAnyOrder("deck/deck-1/a/original", "deck/deck-1/a/sm.webp");
    }

    @Test
    void cleanupRemovedWithNothingRemovedIssuesNoDelete() {
        Set<String> keys = Set.of("deck/deck-1/a/original");

        lifecycle.cleanupRemoved("deck-1", keys, keys);
        lifecycle.cleanupRemoved("deck-1", Set.of("gallery/x/original"), Set.of());

        verify(storage, never()).delete(anyCollection());
    }

    @Test
    void cleanupRemovedIsBestEffort() {
        doThrow(new RuntimeException("s3 down")).when(storage).delete(anyCollection());

        assertThatCode(() -> lifecycle.cleanupRemoved("deck-1",
                Set.of("deck/deck-1/a/original"), Set.of()))
                .doesNotThrowAnyException();
    }

    @Test
    void deleteAllImagesSweepsTheDeckPrefixBestEffort() {
        lifecycle.deleteAllImages("deck-1");
        verify(storage).deletePrefix("deck/deck-1/");

        doThrow(new RuntimeException("s3 down")).when(storage).deletePrefix(anyString());
        assertThatCode(() -> lifecycle.deleteAllImages("deck-1")).doesNotThrowAnyException();
    }

    // ── Fixtures ────────────────────────────────────────────────────────────────

    /** A stored gallery image with SM + LG variants under {@code prefix}. */
    private static AppImage galleryImage(String prefix) {
        AppImage image = new AppImage();
        image.setExternal(false);
        image.setSrcKey(prefix + "/original");
        Map<ImageSizeOptions, String> variants = new EnumMap<>(ImageSizeOptions.class);
        variants.put(ImageSizeOptions.SM, prefix + "/sm.webp");
        variants.put(ImageSizeOptions.LG, prefix + "/lg.webp");
        image.setVariants(variants);
        return image;
    }
}
