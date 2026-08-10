package com.cephadex.ambi.media.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.EnumSet;
import java.util.Set;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.cephadex.ambi.media.variants.ImageVariantJobPublisher;
import com.cephadex.ambi.media.variants.ImageVariantRequests;
import com.cephadex.ambi.media.variants.PendingImageVariantsRepository;

/**
 * Ingest behaviour of {@link ImageIngestService}: payload validation, the single
 * original PUT, the canonical variants map it returns without having rendered
 * anything, and the pending row + job that make that map honest. The ordering
 * assertion — row opened before the original is stored — is the invariant the
 * whole readiness model rests on. The object store and the variant-request seam
 * are both mocked, so nothing touches Garage or a queue.
 */
class ImageIngestServiceTest {

    private S3StorageService storage;
    private ImageVariantRequests variantRequests;
    private ImageIngestService ingest;

    @BeforeEach
    void setUp() {
        storage = mock(S3StorageService.class);
        variantRequests = mock(ImageVariantRequests.class);
        ingest = new ImageIngestService(storage, new MediaProperties(), variantRequests);
    }

    /** A real (if tiny) PNG so the decode that validates the payload can run. */
    private static byte[] pngBytes(int width, int height) {
        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        img.getGraphics().setColor(Color.BLUE);
        img.getGraphics().fillRect(0, 0, width, height);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            ImageIO.write(img, "png", out);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
        return out.toByteArray();
    }

    // ── The happy path ──────────────────────────────────────────────────────────

    @Test
    void ingestStoresOnlyTheOriginalAndReturnsTheCanonicalVariantMap() {
        AppImage image = ingest.ingest(pngBytes(800, 600), "image/png", "sunset.png");

        assertThat(image.isExternal()).isFalse();
        assertThat(image.getSrcKey()).endsWith("/original");
        assertThat(image.getAltText()).isEqualTo("sunset.png");
        assertThat(image.getMetadata()).containsEntry("width", 800).containsEntry("height", 600)
                .containsEntry("originalContentType", "image/png");
        // The full canonical layout comes back immediately — where each rendition
        // will live, not a claim that any of them exists yet.
        assertThat(image.getVariants()).containsOnlyKeys(ImageSizeOptions.values());
        assertThat(image.getVariants().get(ImageSizeOptions.SM)).endsWith("/sm.webp");

        // Exactly one object is written: the untouched original.
        verify(storage).put(eq(image.getSrcKey()), any(), eq("image/png"));
        verify(storage, never()).put(any(), any(), eq("image/webp"));
    }

    @Test
    void ingestOpensThePendingRowBeforeTheOriginalIsStored() {
        // The invariant: the instant the original lands, another request can be
        // handed this key root, and it must never find "no row" while the
        // renditions are missing. The job goes out only once the source exists.
        AppImage image = ingest.ingest(pngBytes(40, 40), "image/png", "x.png");
        String prefix = ImageKeys.prefixOf(image.getSrcKey());

        InOrder order = inOrder(variantRequests, storage);
        order.verify(variantRequests).open(eq(prefix), eq(EnumSet.allOf(ImageSizeOptions.class)), eq("image/png"));
        order.verify(storage).put(eq(image.getSrcKey()), any(), eq("image/png"));
        order.verify(variantRequests).publish(eq(prefix), eq(image.getSrcKey()), anySet(), eq("image/png"));
    }

    @Test
    void ingestUsesTheSuppliedPrefixForItsKeysAndItsRow() {
        String prefix = "drawing/session-1/participant-1/abc";

        AppImage image = ingest.ingest(pngBytes(40, 40), "image/png", null, prefix);

        assertThat(image.getSrcKey()).isEqualTo(prefix + "/original");
        assertThat(image.getAltText()).isNull();
        verify(variantRequests).open(eq(prefix), anySet(), eq("image/png"));
    }

    @Test
    void avifSkipsTheDecodeButIsStillStoredAndEnqueued() {
        // Scrimage cannot decode AVIF, so there are no dimensions to record — but
        // the worker's decoder can, so it gets a job like everything else.
        AppImage image = ingest.ingest("not decodable by scrimage".getBytes(), "image/avif", "x.avif");

        assertThat(image.getMetadata()).containsEntry("originalContentType", "image/avif")
                .doesNotContainKey("width");
        assertThat(image.getVariants()).containsOnlyKeys(ImageSizeOptions.values());
        verify(storage).put(eq(image.getSrcKey()), any(), eq("image/avif"));
        verify(variantRequests).publish(anyString(), anyString(), anySet(), eq("image/avif"));
    }

    @Test
    void everyTierIsRequestedWithItsConfiguredBounds() {
        ingest.ingest(pngBytes(40, 40), "image/png", "x.png");

        ArgumentCaptor<Set<ImageSizeOptions>> requested = ArgumentCaptor.captor();
        verify(variantRequests).open(anyString(), requested.capture(), anyString());
        assertThat(requested.getValue()).containsExactlyInAnyOrder(ImageSizeOptions.values());
    }

    @Test
    void aFailedEnqueueDoesNotFailTheUpload() {
        // Wired through the real ImageVariantRequests so the swallow is exercised
        // end to end: by the time the queue is reached the original is stored and
        // the row is open, so the upload has succeeded — the image simply serves
        // its original until a repair sweep re-publishes.
        ImageVariantJobPublisher publisher = mock(ImageVariantJobPublisher.class);
        doThrow(new IllegalStateException("queue down")).when(publisher).publish(any());
        ImageIngestService realRequests = new ImageIngestService(storage, new MediaProperties(),
                new ImageVariantRequests(mock(PendingImageVariantsRepository.class), publisher,
                        new MediaProperties(), new S3Properties()));

        assertThatCode(() -> realRequests.ingest(pngBytes(40, 40), "image/png", "x.png"))
                .doesNotThrowAnyException();
        verify(storage).put(anyString(), any(), eq("image/png"));
    }

    @Test
    void aFailedRowFailsTheUpload() {
        // The opposite ordering call: without the row the image would advertise
        // five renditions that do not exist, so this one must not be swallowed.
        doThrow(new IllegalStateException("mongo down"))
                .when(variantRequests).open(anyString(), anySet(), any());

        assertThatThrownBy(() -> ingest.ingest(pngBytes(40, 40), "image/png", "x.png"))
                .isInstanceOf(IllegalStateException.class);
        verify(storage, never()).put(any(), any(), any());
    }

    // ── Validation ──────────────────────────────────────────────────────────────

    @Test
    void rejectsDisallowedContentType() {
        assertThatThrownBy(() -> ingest.ingest(pngBytes(10, 10), "image/svg+xml", "x.svg"))
                .isInstanceOf(ValidationException.class);
        verify(storage, never()).put(any(), any(), any());
        verifyNoInteractions(variantRequests);
    }

    @Test
    void rejectsEmptyUpload() {
        assertThatThrownBy(() -> ingest.ingest(new byte[0], "image/png", "x.png"))
                .isInstanceOf(ValidationException.class);
        verify(storage, never()).put(any(), any(), any());
        verifyNoInteractions(variantRequests);
    }

    @Test
    void rejectsOversizeUpload() {
        MediaProperties tiny = new MediaProperties();
        tiny.setMaxUploadBytes(8);
        ImageIngestService capped = new ImageIngestService(storage, tiny, variantRequests);

        assertThatThrownBy(() -> capped.ingest(pngBytes(40, 40), "image/png", "x.png"))
                .isInstanceOf(ValidationException.class);
        verify(storage, never()).put(any(), any(), any());
        verifyNoInteractions(variantRequests);
    }

    @Test
    void rejectsUndecodableBytes() {
        assertThatThrownBy(() -> ingest.ingest("not an image".getBytes(), "image/png", "x.png"))
                .isInstanceOf(ValidationException.class);
        // Decode runs before anything is stored or enqueued, so corrupt bytes
        // surface as a 400 and never become a job the worker can only fail.
        verify(storage, never()).put(any(), any(), any());
        verifyNoInteractions(variantRequests);
    }
}
