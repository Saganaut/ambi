package com.cephadex.ambi.auth.config;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.cephadex.ambi.auth.service.AuthService;
import com.cephadex.ambi.config.AmbiApplication;

/**
 * Pins Invariant 3 against the REAL {@link SecurityConfig} chain. Uses the full
 * Spring Boot context (no {@code test} profile, so {@code SecurityConfig}'s
 * {@code @Profile("!test")} is active and the permit-all {@code TestSecurityConfig}
 * is not). Requires Docker (Mongo + Redis) for context bean instantiation; no
 * actual DB calls are made because {@code AuthService} is mocked.
 *
 * <p>A state-changing request without a CSRF token is rejected; the same request
 * with a valid double-submit token proceeds.
 */
@SpringBootTest(classes = AmbiApplication.class)
@AutoConfigureMockMvc
class CsrfEnforcementTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @Test
    void cookieOnlyMutationIsRejected() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isForbidden());
    }

    @Test
    void mutationWithCsrfTokenProceeds() throws Exception {
        mockMvc.perform(post("/api/auth/logout").with(csrf()))
                .andExpect(status().isNoContent());
    }
}
