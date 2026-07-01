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
import com.cephadex.ambi.auth.dto.GuestMe;
import com.cephadex.ambi.auth.dto.MeResponse;
import com.cephadex.ambi.auth.dto.RegisteredMe;
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
        AuthProperties props = new AuthProperties();
        AuthController controller =
                new AuthController(authService, props, new SessionCookieFactory(props));
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
    void usernameAvailableEchoesQueryAndDelegatesVerdict() throws Exception {
        when(authService.isUsernameAvailable("alice")).thenReturn(true);
        when(authService.isUsernameAvailable("taken")).thenReturn(false);

        mockMvc.perform(get("/api/auth/username-available").param("username", "alice"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.available").value(true));

        mockMvc.perform(get("/api/auth/username-available").param("username", "taken"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("taken"))
                .andExpect(jsonPath("$.available").value(false));
    }

    @Test
    void guestCreateSetsHttpOnlyCookiesAndReturnsGuestBody() throws Exception {
        MeResponse guestMe = new GuestMe("pub-1", "guest-abc", "Guest",
                UserLevel.GUEST, MembershipTier.FREE, MembershipStatus.NONE);
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
    void refreshReadsRtCookieAndReturnsNewCookies() throws Exception {
        MeResponse refreshed = new RegisteredMe("pub-r", "alice", "Alice", "alice@example.com",
                UserLevel.USER, MembershipTier.INDIVIDUAL, MembershipStatus.ACTIVE);
        when(authService.refresh("old-rt")).thenReturn(new AuthService.AuthSession(
                new RedisTokenSessionService.Tokens("new-at", "new-rt", "sid-r", false), refreshed));

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("AMBI_RT", "old-rt")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("REGISTERED"))
                .andExpect(cookie().value("AMBI_AT", "new-at"))
                .andExpect(cookie().value("AMBI_RT", "new-rt"))
                .andExpect(cookie().httpOnly("AMBI_AT", true))
                .andExpect(cookie().httpOnly("AMBI_RT", true));
    }

    @Test
    void registerReturns200WithCookiesAndBody() throws Exception {
        MeResponse registered = new RegisteredMe("pub-1", "newname", "New Person", "new@example.com",
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
