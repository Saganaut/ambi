package com.cephadex.ambi.auth.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.cephadex.ambi.auth.config.AuthProperties;
import com.cephadex.ambi.auth.dto.MeResponse;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.service.AuthService;
import com.cephadex.ambi.auth.service.RedisTokenSessionService;
import com.cephadex.ambi.billing.enums.MembershipStatus;
import com.cephadex.ambi.billing.enums.MembershipTier;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Tests the controller plumbing (status codes, cookie headers, JSON shape) in
 * isolation via standalone {@code MockMvc}. The four-state/entitlement logic
 * itself is unit-tested in {@code AuthServiceTest}; CSRF enforcement is pinned
 * in {@code CsrfEnforcementTest}. Standalone setup sidesteps the
 * Boot-4 {@code @WebMvcTest} slice's controller-registration quirks.
 */
@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AuthController controller = new AuthController(authService, new AuthProperties());
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                // @AuthenticationPrincipal is resolved by Spring Security; register the
                // resolver explicitly since standalone setup doesn't pull in the security chain.
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
    }

    @Test
    void meReturns200ForVisitor() throws Exception {
        when(authService.resolveMe(any())).thenReturn(MeResponse.visitor());

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(false))
                .andExpect(jsonPath("$.state").value("VISITOR"));
    }

    @Test
    void guestCreateSetsHttpOnlyCookiesAndReturnsGuestBody() throws Exception {
        MeResponse guestMe = new MeResponse(true, IdentityState.GUEST, false,
                "pub-1", "guest-abc", "Guest", null, UserLevel.GUEST,
                MembershipTier.FREE, MembershipStatus.NONE);
        when(authService.createGuest(any())).thenReturn(new AuthService.AuthSession(
                new RedisTokenSessionService.Tokens("access-jwt", "refresh-tok", "sid-1", false), guestMe));

        mockMvc.perform(post("/api/auth/guest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("GUEST"))
                .andExpect(jsonPath("$.userLevel").value("GUEST"))
                .andExpect(cookie().value("AMBI_AT", "access-jwt"))
                .andExpect(cookie().httpOnly("AMBI_AT", true))
                .andExpect(cookie().value("AMBI_RT", "refresh-tok"))
                .andExpect(cookie().httpOnly("AMBI_RT", true));
    }

    @Test
    void logoutReturns204AndClearsCookies() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isNoContent())
                .andExpect(cookie().value("AMBI_AT", ""))
                .andExpect(cookie().maxAge("AMBI_AT", 0))
                .andExpect(cookie().maxAge("AMBI_RT", 0));
    }

    @Test
    void registerReturns200WithCookiesAndBody() throws Exception {
        MeResponse registered = new MeResponse(true, IdentityState.REGISTERED, false,
                "pub-1", "newname", "New Person", "new@example.com",
                UserLevel.USER, MembershipTier.FREE, MembershipStatus.NONE);
        when(authService.register(any(), any())).thenReturn(new AuthService.AuthSession(
                new RedisTokenSessionService.Tokens("acc", "ref", "new-sid", false), registered));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"newname\",\"displayName\":\"New Person\",\"newsletter\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("REGISTERED"))
                .andExpect(jsonPath("$.username").value("newname"))
                .andExpect(cookie().value("AMBI_AT", "acc"))
                .andExpect(cookie().httpOnly("AMBI_AT", true))
                .andExpect(cookie().value("AMBI_RT", "ref"));
    }
}
