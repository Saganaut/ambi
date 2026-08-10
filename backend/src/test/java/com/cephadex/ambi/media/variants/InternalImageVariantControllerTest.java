package com.cephadex.ambi.media.variants;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.cephadex.ambi.common.exception.GlobalExceptionHandler;
import com.cephadex.ambi.common.exception.UnauthorizedException;
import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.cephadex.ambi.media.variants.dto.ImageVariantsReadyRequest;

/**
 * The worker callback's HTTP contract in isolation via standalone
 * {@code MockMvc}: a good secret is {@code 204}, a wrong or missing one is
 * {@code 401 WORKER_AUTH_FAILED} (indistinguishably), a malformed body is
 * {@code 400 VALIDATION_FAILED}, and an unknown key root is still {@code 204} —
 * SQS redelivery makes that the normal case, not an error. Secret semantics live
 * in {@code WorkerCallbackAuthenticatorTest}; the real controller advice is
 * wired in so the errors are asserted in the shape the worker actually sees.
 */
class InternalImageVariantControllerTest {

    private static final String PATH = "/api/internal/image-variants";
    private static final String BODY = """
            { "keyRoot": "gallery/abc", "readyTiers": ["XS", "SM"], "terminal": false, "attempt": 1 }
            """;

    private WorkerCallbackAuthenticator authenticator;
    private ImageVariantCompletionService completions;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        authenticator = mock(WorkerCallbackAuthenticator.class);
        completions = mock(ImageVariantCompletionService.class);
        mockMvc = MockMvcBuilders
                .standaloneSetup(new InternalImageVariantController(authenticator, completions))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void aValidReportIsAppliedAndAnswers204() throws Exception {
        mockMvc.perform(post(PATH)
                .header(InternalImageVariantController.WORKER_SECRET_HEADER, "the-secret")
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY))
                .andExpect(status().isNoContent());

        verify(authenticator).require("the-secret");
        ArgumentCaptor<ImageVariantsReadyRequest> applied =
                ArgumentCaptor.forClass(ImageVariantsReadyRequest.class);
        verify(completions).apply(applied.capture());
        assertThat(applied.getValue().keyRoot()).isEqualTo("gallery/abc");
        assertThat(applied.getValue().readyTiers())
                .containsExactlyInAnyOrder(ImageSizeOptions.XS, ImageSizeOptions.SM);
    }

    @Test
    void anUnknownKeyRootIsStill204() throws Exception {
        // The completion service no-ops on a row that is already gone; a
        // redelivered message must not look like a failure to the worker, or it
        // would retry forever and eventually land in the DLQ.
        mockMvc.perform(post(PATH)
                .header(InternalImageVariantController.WORKER_SECRET_HEADER, "the-secret")
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY))
                .andExpect(status().isNoContent());
    }

    @Test
    void aWrongSecretIs401AndNeverReachesTheService() throws Exception {
        doThrow(new UnauthorizedException("WORKER_AUTH_FAILED", "Not authorized."))
                .when(authenticator).require(any());

        mockMvc.perform(post(PATH)
                .header(InternalImageVariantController.WORKER_SECRET_HEADER, "wrong")
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("WORKER_AUTH_FAILED"));

        verify(completions, never()).apply(any());
    }

    @Test
    void aMissingSecretIs401TheSameWay() throws Exception {
        doThrow(new UnauthorizedException("WORKER_AUTH_FAILED", "Not authorized."))
                .when(authenticator).require(any());

        mockMvc.perform(post(PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("WORKER_AUTH_FAILED"));

        verify(authenticator).require(null);
        verify(completions, never()).apply(any());
    }

    @Test
    void aMalformedBodyIs400() throws Exception {
        mockMvc.perform(post(PATH)
                .header(InternalImageVariantController.WORKER_SECRET_HEADER, "the-secret")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        { "keyRoot": "", "readyTiers": ["XS"], "terminal": false, "attempt": 1 }
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

        verify(completions, never()).apply(any());
    }
}
