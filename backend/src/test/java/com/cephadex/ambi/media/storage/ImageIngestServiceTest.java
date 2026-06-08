package com.cephadex.ambi.media.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;

/**
 * Ingest behaviour of {@link ImageIngestService}: payload validation, original
 * + per-tier WebP persistence, and the populated {@link AppImage}. The object
 * store is mocked, so this asserts what gets written (keys, content types,
 * counts) without touching Garage.
 */
class ImageIngestServiceTest {

    private S3StorageService storage;
    private ImageIngestService ingest;

    @BeforeEach
    void setUp() {
        storage = mock(S3StorageService.class);
        ingest = new ImageIngestService(storage, new MediaProperties());
    }

    /** A real (if tiny) PNG so Scrimage can actually decode + re-encode it. */
    private static byte[] pngBytes(int w, int h) {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        img.getGraphics().setColor(Color.BLUE);
        img.getGraphics().fillRect(0, 0, w, h);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            ImageIO.write(img, "png", out);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        return out.toByteArray();
    }

    @Test
    void ingestStoresOriginalPlusEveryTierAndPopulatesImage() {
        AppImage image = ingest.ingest(pngBytes(800, 600), "image/png", "sunset.png");

        assertThat(image.isExternal()).isFalse();
        assertThat(image.getSrcKey()).endsWith("/original");
        assertThat(image.getAltText()).isEqualTo("sunset.png");
        assertThat(image.getVariants()).containsOnlyKeys(ImageSizeOptions.values());
        assertThat(image.getVariants().get(ImageSizeOptions.SM)).endsWith("/sm.webp");
        assertThat(image.getMetadata()).containsEntry("width", 800).containsEntry("height", 600);

        // original (image/png) + one WebP per tier.
        verify(storage).put(eq(image.getSrcKey()), any(), eq("image/png"));
        verify(storage, times(ImageSizeOptions.values().length))
                .put(any(), any(), eq("image/webp"));
    }

    @Test
    void rejectsDisallowedContentType() {
        assertThatThrownBy(() -> ingest.ingest(pngBytes(10, 10), "image/svg+xml", "x.svg"))
                .isInstanceOf(ValidationException.class);
        verify(storage, never()).put(any(), any(), any());
    }

    @Test
    void rejectsEmptyUpload() {
        assertThatThrownBy(() -> ingest.ingest(new byte[0], "image/png", "x.png"))
                .isInstanceOf(ValidationException.class);
        verify(storage, never()).put(any(), any(), any());
    }

    @Test
    void rejectsOversizeUpload() {
        MediaProperties tiny = new MediaProperties();
        tiny.setMaxUploadBytes(8);
        ImageIngestService capped = new ImageIngestService(storage, tiny);

        assertThatThrownBy(() -> capped.ingest(pngBytes(40, 40), "image/png", "x.png"))
                .isInstanceOf(ValidationException.class);
        verify(storage, never()).put(any(), any(), any());
    }

    @Test
    void rejectsUndecodableBytes() {
        assertThatThrownBy(() -> ingest.ingest("not an image".getBytes(), "image/png", "x.png"))
                .isInstanceOf(ValidationException.class);
        // Decode is attempted before anything is stored, so a corrupt payload
        // surfaces as a 400 with nothing written.
        verify(storage, never()).put(any(), any(), any());
    }
}
