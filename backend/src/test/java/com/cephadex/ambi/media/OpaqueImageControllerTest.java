package com.cephadex.ambi.media;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.cephadex.ambi.common.exception.GlobalExceptionHandler;
import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.media.storage.OpaqueImageUrls;
import com.cephadex.ambi.media.storage.S3StorageService;
import com.cephadex.ambi.media.storage.S3StorageService.StoredObject;

/**
 * Controller plumbing for the opaque image proxy in isolation via standalone
 * {@code MockMvc}, mirroring {@code GalleryControllerTest}: the token is
 * exchanged for a key, the stored bytes go back with their own content type
 * under a private cache directive, and the two failure modes surface as the
 * registry's existing codes. Token semantics live in {@code OpaqueImageUrlsTest}
 * (the resolver is mocked here); the real controller advice is wired in so the
 * error responses are asserted in the shape a client actually sees.
 */
class OpaqueImageControllerTest {

    private static final String TOKEN = "payload.signature";
    private static final String KEY = "drawing/session-1/participant-1/lg.webp";

    private OpaqueImageUrls opaqueImageUrls;
    private S3StorageService storage;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        opaqueImageUrls = mock(OpaqueImageUrls.class);
        storage = mock(S3StorageService.class);
        mockMvc = MockMvcBuilders
                .standaloneSetup(new OpaqueImageController(opaqueImageUrls, storage))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void streamsTheStoredBytesWithTheirTypePrivatelyCached() throws Exception {
        when(opaqueImageUrls.keyFrom(TOKEN)).thenReturn(KEY);
        when(storage.get(KEY)).thenReturn(new StoredObject(new byte[] { 7, 8, 9 }, "image/webp"));

        mockMvc.perform(get("/api/media/opaque-image").param("t", TOKEN))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/webp"))
                // The bytes are authorized per caller — never a shared cache.
                .andExpect(header().string("Cache-Control", "max-age=3600, private"))
                .andExpect(content().bytes(new byte[] { 7, 8, 9 }));
    }

    @Test
    void fallsBackToOctetStreamWhenTheStoredTypeIsMissing() throws Exception {
        when(opaqueImageUrls.keyFrom(any())).thenReturn(KEY);
        when(storage.get(KEY)).thenReturn(new StoredObject(new byte[] { 1 }, null));

        mockMvc.perform(get("/api/media/opaque-image").param("t", TOKEN))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_OCTET_STREAM));
    }

    @Test
    void anUnusableTokenIs400AndNeverReachesStorage() throws Exception {
        when(opaqueImageUrls.keyFrom(eq("tampered")))
                .thenThrow(new ValidationException("That image link is not valid."));

        mockMvc.perform(get("/api/media/opaque-image").param("t", "tampered"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void aValidTokenForAMissingObjectIs404() throws Exception {
        when(opaqueImageUrls.keyFrom(TOKEN)).thenReturn(KEY);
        when(storage.get(KEY)).thenReturn(null);

        // Same "there is no file here" code the gallery's own byte read uses.
        mockMvc.perform(get("/api/media/opaque-image").param("t", TOKEN))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("GALLERY_IMAGE_NOT_FOUND"));
    }

    @Test
    void aMissingTokenParameterIs400() throws Exception {
        mockMvc.perform(get("/api/media/opaque-image"))
                .andExpect(status().isBadRequest());
    }
}
