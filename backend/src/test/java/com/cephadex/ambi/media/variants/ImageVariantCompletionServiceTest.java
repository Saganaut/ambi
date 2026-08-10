package com.cephadex.ambi.media.variants;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.EnumSet;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.cephadex.ambi.media.variants.dto.ImageVariantsReadyRequest;

/**
 * What a worker's completion report does to the pending row: the tiers are
 * unioned (never replaced, so partial reports accumulate), the row is deleted
 * exactly when nothing is outstanding, the cached readiness is dropped either
 * way, and a report for a row that is already gone is a silent no-op — the
 * shape SQS redelivery guarantees will happen.
 *
 * <p>The union itself is atomic inside Mongo, so it is
 * {@code recordReady}'s "is it complete now?" answer that is stubbed here; that
 * the {@code $addToSet} accumulates is the repository's contract, not this
 * service's.
 */
class ImageVariantCompletionServiceTest {

    private static final String KEY_ROOT = "gallery/abc";

    private PendingImageVariantsRepository repository;
    private ImageVariantReadiness readiness;
    private ImageVariantCompletionService completions;

    @BeforeEach
    void setUp() {
        repository = mock(PendingImageVariantsRepository.class);
        readiness = mock(ImageVariantReadiness.class);
        completions = new ImageVariantCompletionService(repository, readiness);
    }

    @Test
    void aPartialReportRecordsItsTiersAndKeepsTheRow() {
        when(repository.recordReady(anyString(), anySet(), anyBoolean())).thenReturn(false);

        completions.apply(report(EnumSet.of(ImageSizeOptions.XS, ImageSizeOptions.SM), false));

        verify(repository).recordReady(KEY_ROOT, EnumSet.of(ImageSizeOptions.XS, ImageSizeOptions.SM), false);
        verify(repository, never()).deleteById(anyString());
        // Still invalidated: the two tiers it did land must become visible now.
        verify(readiness).invalidate(KEY_ROOT);
    }

    @Test
    void twoPartialReportsAccumulateUntilTheSecondCompletesTheRow() {
        // Stands in for the atomic $addToSet: tiers union rather than replace, so
        // a worker reporting in batches never retracts what it already stored.
        PendingImageVariants row = new PendingImageVariants();
        row.setId(KEY_ROOT);
        row.setRequestedTiers(EnumSet.allOf(ImageSizeOptions.class));
        when(repository.recordReady(anyString(), anySet(), anyBoolean())).thenAnswer(invocation -> {
            row.getReadyTiers().addAll(invocation.getArgument(1));
            return row.unreadyTiers().isEmpty();
        });

        completions.apply(report(EnumSet.of(ImageSizeOptions.XS, ImageSizeOptions.SM), false));
        verify(repository, never()).deleteById(anyString());

        completions.apply(report(
                EnumSet.of(ImageSizeOptions.MD, ImageSizeOptions.LG, ImageSizeOptions.XL), false));

        assertThat(row.unreadyTiers()).isEmpty();
        verify(repository).deleteById(KEY_ROOT);
    }

    @Test
    void theReportThatCompletesTheSetDeletesTheRow() {
        when(repository.recordReady(anyString(), anySet(), anyBoolean())).thenReturn(true);

        completions.apply(report(EnumSet.of(ImageSizeOptions.MD, ImageSizeOptions.LG, ImageSizeOptions.XL), false));

        verify(repository).deleteById(KEY_ROOT);
        verify(readiness).invalidate(KEY_ROOT);
    }

    @Test
    void aRedeliveryAfterTheRowIsGoneIsANoOp() {
        // No row to update, so nothing is complete and nothing is deleted — the
        // same outcome as the delivery that completed it in the first place.
        when(repository.recordReady(anyString(), anySet(), anyBoolean())).thenReturn(false);

        completions.apply(report(EnumSet.allOf(ImageSizeOptions.class), false));

        verify(repository, never()).deleteById(anyString());
    }

    @Test
    void aTerminalReportWithTiersStillMissingKeepsTheRow() {
        // The undecodable-original case: the row survives forever so the missing
        // tiers stay hidden and the original serves indefinitely. Reaping it
        // would flip the image to "all five are real" and 404 every rendition.
        when(repository.recordReady(anyString(), anySet(), eq(true))).thenReturn(false);

        completions.apply(report(Set.of(), true));

        verify(repository).recordReady(KEY_ROOT, Set.of(), true);
        verify(repository, never()).deleteById(anyString());
    }

    private static ImageVariantsReadyRequest report(Set<ImageSizeOptions> readyTiers, boolean terminal) {
        return new ImageVariantsReadyRequest(KEY_ROOT, readyTiers, terminal, 1);
    }
}
