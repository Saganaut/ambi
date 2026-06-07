package com.cephadex.ambi.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.cephadex.ambi.common.validation.ValidationConstants;

/**
 * Guards the validation single-source-of-truth contract: the Jakarta constraints
 * that reference {@link ValidationConstants} must surface in the generated
 * OpenAPI document as schema facets ({@code maxLength}/{@code minLength}/
 * {@code minimum}/{@code pattern}/array {@code maxItems}). The frontend's
 * {@code validationConstants.ts} is generated from exactly this document
 * ({@code frontend/scripts/generate-validation.mjs}), so if SpringDoc — or
 * {@link OpenApiConfig}'s post-processing — ever stopped emitting these, the
 * bridge would silently break. This test fails loudly instead.
 *
 * <p>Uses the permissive {@code test} profile so {@code /v3/api-docs} is reachable
 * without auth. Like the other full-context tests it needs Docker (Mongo + Redis)
 * to instantiate the context; no DB calls are made.
 */
@SpringBootTest(classes = AmbiApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpenApiValidationFacetsTest {

    @Autowired
    private MockMvc mockMvc;

    private static final String SCHEMAS = "$.components.schemas.";

    @Test
    void stringSizeAndPatternFacetsAreEmitted() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                // Deck name cap (NAME_MAX, shared across deck/theme/gallery/image).
                .andExpect(jsonPath(SCHEMAS + "UpdateDeckRequest.properties.name.maxLength")
                        .value(ValidationConstants.NAME_MAX))
                .andExpect(jsonPath(SCHEMAS + "UpdateDeckRequest.properties.description.maxLength")
                        .value(ValidationConstants.DECK_DESCRIPTION_MAX))
                // Username size + pattern.
                .andExpect(jsonPath(SCHEMAS + "RegisterRequest.properties.username.minLength")
                        .value(ValidationConstants.USERNAME_MIN))
                .andExpect(jsonPath(SCHEMAS + "RegisterRequest.properties.username.maxLength")
                        .value(ValidationConstants.USERNAME_MAX))
                .andExpect(jsonPath(SCHEMAS + "RegisterRequest.properties.username.pattern")
                        .value(ValidationConstants.USERNAME_PATTERN));
    }

    @Test
    void arrayAndNumericFacetsAreEmitted() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                // Tag set: array-level count cap + per-element length bounds. The
                // element @Size on Set<String> doesn't propagate into items{} on its
                // own, so SetTagsRequest restates it via @ArraySchema/@Schema — these
                // assertions guard that the per-tag bound keeps reaching the schema.
                .andExpect(jsonPath(SCHEMAS + "SetTagsRequest.properties.tags.maxItems")
                        .value(ValidationConstants.TAG_MAX_COUNT))
                .andExpect(jsonPath(SCHEMAS + "SetTagsRequest.properties.tags.items.minLength")
                        .value(ValidationConstants.TAG_MIN_LENGTH))
                .andExpect(jsonPath(SCHEMAS + "SetTagsRequest.properties.tags.items.maxLength")
                        .value(ValidationConstants.TAG_MAX_LENGTH))
                // Numeric @Min on the move index.
                .andExpect(jsonPath(SCHEMAS + "MoveSlideRequest.properties.to.minimum")
                        .value(ValidationConstants.SLIDE_INDEX_MIN));
    }
}
