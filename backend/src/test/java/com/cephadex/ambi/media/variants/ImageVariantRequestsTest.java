package com.cephadex.ambi.media.variants;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.cephadex.ambi.media.storage.ImageKeys;
import com.cephadex.ambi.media.storage.MediaProperties;
import com.cephadex.ambi.media.storage.S3Properties;

/**
 * The write side of the readiness model: the pending row is opened regardless of
 * configuration, and the job that closes it carries the cross-language contract
 * — schema version, key root, source key, bucket, and one bounded tier per
 * request. The tier bounds travel in the message precisely so the worker holds
 * no copy of them, and the key derivation the worker applies to
 * {@code keyRoot} is pinned here against {@code ImageKeys}, its twin on this
 * side.
 */
class ImageVariantRequestsTest {

    private static final String KEY_ROOT = "gallery/abc";
    private static final Instant NOW = Instant.parse("2026-08-10T12:00:00Z");

    private PendingImageVariantsRepository repository;
    private ImageVariantJobPublisher publisher;
    private MediaProperties props;
    private ImageVariantRequests requests;

    @BeforeEach
    void setUp() {
        repository = mock(PendingImageVariantsRepository.class);
        publisher = mock(ImageVariantJobPublisher.class);
        props = new MediaProperties();
        S3Properties s3 = new S3Properties();
        s3.setBucket("ambi-images");
        requests = new ImageVariantRequests(repository, publisher, props, s3,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void openWritesTheRowWithEveryRequestedTier() {
        Set<ImageSizeOptions> tiers = EnumSet.allOf(ImageSizeOptions.class);

        requests.open(KEY_ROOT, tiers, "image/jpeg");

        verify(repository).openPending(KEY_ROOT, tiers, "image/jpeg");
    }

    @Test
    void theJobCarriesTheWireContract() {
        requests.publish(KEY_ROOT, ImageKeys.originalKey(KEY_ROOT),
                EnumSet.allOf(ImageSizeOptions.class), "image/jpeg");

        ArgumentCaptor<ImageVariantJobMessage> job = ArgumentCaptor.forClass(ImageVariantJobMessage.class);
        verify(publisher).publish(job.capture());
        ImageVariantJobMessage sent = job.getValue();
        assertThat(sent.version()).isEqualTo(1);
        assertThat(sent.keyRoot()).isEqualTo(KEY_ROOT);
        assertThat(sent.srcKey()).isEqualTo("gallery/abc/original");
        assertThat(sent.bucket()).isEqualTo("ambi-images");
        assertThat(sent.contentType()).isEqualTo("image/jpeg");
        assertThat(sent.requestedAt()).isEqualTo(NOW);
        assertThat(sent.tiers()).containsExactly(
                new ImageVariantJobMessage.TierRequest(ImageSizeOptions.XS, 64),
                new ImageVariantJobMessage.TierRequest(ImageSizeOptions.SM, 200),
                new ImageVariantJobMessage.TierRequest(ImageSizeOptions.MD, 480),
                new ImageVariantJobMessage.TierRequest(ImageSizeOptions.LG, 960),
                new ImageVariantJobMessage.TierRequest(ImageSizeOptions.XL, 1600));
    }

    @Test
    void theWorkerDerivesTheVariantKeyItselfFromTheKeyRoot() {
        // The message deliberately carries no variant keys. This is the backend
        // half of that contract — its twin is the worker's own assertion that
        // "{keyRoot}/{tier}.webp" is what it writes.
        assertThat(ImageKeys.variantKey(KEY_ROOT, ImageSizeOptions.MD)).isEqualTo("gallery/abc/md.webp");
    }

    @Test
    void aPartialRepublishAsksForOnlyTheTiersItNames() {
        requests.publish(KEY_ROOT, ImageKeys.originalKey(KEY_ROOT),
                EnumSet.of(ImageSizeOptions.LG, ImageSizeOptions.XL), "image/png");

        ArgumentCaptor<ImageVariantJobMessage> job = ArgumentCaptor.forClass(ImageVariantJobMessage.class);
        verify(publisher).publish(job.capture());
        assertThat(job.getValue().tiers()).containsExactly(
                new ImageVariantJobMessage.TierRequest(ImageSizeOptions.LG, 960),
                new ImageVariantJobMessage.TierRequest(ImageSizeOptions.XL, 1600));
    }

    @Test
    void disablingThePipelineStopsTheJobButNeverTheRow() {
        // Gating the row too would let an image claim renditions that nobody is
        // going to render — the one failure mode the whole model exists to stop.
        props.getVariants().setEnabled(false);

        requests.open(KEY_ROOT, EnumSet.allOf(ImageSizeOptions.class), "image/png");
        requests.publish(KEY_ROOT, ImageKeys.originalKey(KEY_ROOT),
                EnumSet.allOf(ImageSizeOptions.class), "image/png");

        verify(repository).openPending(anyString(), anySet(), anyString());
        verifyNoInteractions(publisher);
    }

    @Test
    void aFailedPublishIsSwallowedButAFailedRowIsNot() {
        doThrow(new IllegalStateException("queue down")).when(publisher).publish(any());
        assertThatCode(() -> requests.publish(KEY_ROOT, ImageKeys.originalKey(KEY_ROOT),
                EnumSet.allOf(ImageSizeOptions.class), "image/png")).doesNotThrowAnyException();

        doThrow(new IllegalStateException("mongo down")).when(repository)
                .openPending(anyString(), anySet(), any());
        assertThatThrownBy(() -> requests.open(KEY_ROOT, EnumSet.allOf(ImageSizeOptions.class), "image/png"))
                .isInstanceOf(IllegalStateException.class);
    }
}
