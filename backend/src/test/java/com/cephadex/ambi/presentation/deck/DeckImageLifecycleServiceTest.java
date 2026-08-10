package com.cephadex.ambi.presentation.deck;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Collection;
import java.util.EnumMap;
import java.util.HashMap;
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
import com.cephadex.ambi.media.variants.ImageVariantCleanup;
import com.cephadex.ambi.media.variants.ImageVariantRequests;
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
    private ImageVariantRequests variantRequests;
    private ImageVariantCleanup variantCleanup;
    private DeckImageLifecycleService lifecycle;

    @BeforeEach
    void setUp() {
        storage = mock(S3StorageService.class);
        variantRequests = mock(ImageVariantRequests.class);
        variantCleanup = mock(ImageVariantCleanup.class);
        lifecycle = new DeckImageLifecycleService(storage, variantRequests, variantCleanup);
        // The default: every source object is there to copy.
        when(storage.copyIfExists(anyString(), anyString())).thenReturn(true);
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
    void aFullyCopiedAdoptionWritesNoPendingRow() {
        // Every canonical tier landed under the new prefix, so absence of a row
        // is the truth — and absence is what readers cache forever.
        AppImage image = fullyTieredImage("gallery/complete");

        lifecycle.adoptImage("deck-1", image);

        assertThat(image.getVariants()).containsOnlyKeys(ImageSizeOptions.values());
        verifyNoInteractions(variantRequests);
    }

    @Test
    void aTierThatDidNotCopyIsRecordedAsMissingAndReRequested() {
        // The source was itself mid-render (or had failed): copying a tier that
        // was never there returns false, and recording its key anyway is what
        // used to hand every reader of the adopted image a URL to nothing.
        AppImage image = fullyTieredImage("gallery/partial");
        when(storage.copyIfExists(eq("gallery/partial/lg.webp"), anyString())).thenReturn(false);
        when(storage.copyIfExists(eq("gallery/partial/xl.webp"), anyString())).thenReturn(false);

        lifecycle.adoptImage("deck-1", image);

        String prefix = ImageKeys.prefixOf(image.getSrcKey());
        assertThat(image.getVariants()).containsOnlyKeys(
                ImageSizeOptions.XS, ImageSizeOptions.SM, ImageSizeOptions.MD);
        verify(variantRequests).open(prefix,
                Set.of(ImageSizeOptions.LG, ImageSizeOptions.XL), "image/png");
        verify(variantRequests).publish(prefix, image.getSrcKey(),
                Set.of(ImageSizeOptions.LG, ImageSizeOptions.XL), "image/png");
    }

    @Test
    void adoptImageWithoutVariantsCopiesOnlyTheOriginalAndOpensAFullRow() {
        // A freshly ingested source, still un-rendered: nothing to copy but the
        // original, so every tier is outstanding under the new prefix too.
        AppImage image = new AppImage();
        image.setExternal(false);
        image.setSrcKey("gallery/fresh/original");
        image.setVariants(new EnumMap<>(ImageSizeOptions.class));

        lifecycle.adoptImage("deck-1", image);

        assertThat(image.getSrcKey()).startsWith("deck/deck-1/");
        assertThat(image.getVariants()).isEmpty();
        verify(storage).copyIfExists(eq("gallery/fresh/original"), anyString());
        verify(variantRequests).open(anyString(), eq(Set.of(ImageSizeOptions.values())), any());
    }

    @Test
    void anAdoptionWhoseOriginalIsGoneOpensARowButPublishesNoJob() {
        // There is nothing to render from, so a job could only fail its way to
        // terminal — but the row still has to hide the tiers that aren't there.
        AppImage image = fullyTieredImage("gallery/vanished");
        when(storage.copyIfExists(anyString(), anyString())).thenReturn(false);

        lifecycle.adoptImage("deck-1", image);

        verify(variantRequests).open(anyString(), anySet(), any());
        verify(variantRequests, never()).publish(anyString(), anyString(), anySet(), any());
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
        verify(variantCleanup).forgetPrefix("deck/deck-1/");

        doThrow(new RuntimeException("s3 down")).when(storage).deletePrefix(anyString());
        assertThatCode(() -> lifecycle.deleteAllImages("deck-1")).doesNotThrowAnyException();
    }

    @Test
    void cleanupRemovedForgetsThePendingRowsOfWhatItDeleted() {
        // A row for bytes that are gone would only make a repair sweep re-enqueue
        // work for an image nobody can read.
        Set<String> before = new LinkedHashSet<>(List.of(
                "deck/deck-1/a/original", "deck/deck-1/a/sm.webp"));

        lifecycle.cleanupRemoved("deck-1", before, Set.of());

        verify(variantCleanup).forgetAll(List.of("deck/deck-1/a/original", "deck/deck-1/a/sm.webp"));
    }

    // ── Fixtures ────────────────────────────────────────────────────────────────

    /** A stored gallery image with all five canonical variants under {@code prefix}. */
    private static AppImage fullyTieredImage(String prefix) {
        AppImage image = new AppImage();
        image.setExternal(false);
        image.setSrcKey(prefix + "/original");
        image.setVariants(ImageKeys.variantsFor(prefix + "/original"));
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("originalContentType", "image/png");
        image.setMetadata(metadata);
        return image;
    }

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
