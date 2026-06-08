package com.cephadex.ambi.auth.config;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestRedirectFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

import com.cephadex.ambi.auth.security.CookieAuthenticationFilter;
import com.cephadex.ambi.auth.security.GoogleOAuth2SuccessHandler;
import com.cephadex.ambi.auth.security.OAuthReturnUrlCaptureFilter;
import com.cephadex.ambi.auth.service.RedisTokenSessionService;
import com.cephadex.ambi.config.MdcLoggingFilter;
import com.cephadex.ambi.user.UserService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * The application security filter chain (auth/README.md). Cookie + Redis session
 * auth, CSRF via double-submit cookie, CORS locked to the frontend origin, and
 * the four-state authorization model. Excluded from the {@code test} profile so
 * tests run under {@code TestSecurityConfig}.
 */
@Configuration
@EnableWebSecurity
@Profile("!test")
public class SecurityConfig {

    private final AuthProperties props;
    private final CookieAuthenticationFilter cookieAuthenticationFilter;
    private final OAuthReturnUrlCaptureFilter oauthReturnUrlCaptureFilter;
    private final GoogleOAuth2SuccessHandler googleOAuth2SuccessHandler;
    private final HandlerExceptionResolver handlerExceptionResolver;

    public SecurityConfig(AuthProperties props,
            RedisTokenSessionService tokenService,
            UserService userService,
            GoogleOAuth2SuccessHandler googleOAuth2SuccessHandler,
            @Qualifier("handlerExceptionResolver") HandlerExceptionResolver handlerExceptionResolver) {
        this.props = props;
        // Constructed inline (not @Beans) so Spring Boot does not also register
        // them as plain servlet filters outside the security chain.
        this.cookieAuthenticationFilter = new CookieAuthenticationFilter(props, tokenService, userService);
        this.oauthReturnUrlCaptureFilter = new OAuthReturnUrlCaptureFilter(props);
        this.googleOAuth2SuccessHandler = googleOAuth2SuccessHandler;
        this.handlerExceptionResolver = handlerExceptionResolver;
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf
                        // Double-submit cookie (Inv 3): the SPA echoes XSRF-TOKEN in X-XSRF-TOKEN.
                        .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                        // Only the framework OAuth endpoints are exempt.
                        .ignoringRequestMatchers("/oauth2/**", "/login/oauth2/**"))
                // We own session state in Redis; there is no servlet session to back.
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Phase-1 always-available endpoints. Listed individually (no
                        // HttpMethod overload) because Spring Security 7's PathPattern
                        // matcher is the safest, most predictable form.
                        .requestMatchers("/api/auth/me",
                                "/api/auth/username-available",
                                "/api/auth/guest",
                                "/api/auth/refresh",
                                "/api/auth/logout").permitAll()
                        .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                        .requestMatchers("/actuator/health/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                        // register is the one route a preRegistration principal may POST (Inv 8).
                        .requestMatchers(HttpMethod.POST, "/api/auth/register").hasRole("PRE_REGISTRATION")
                        // Everything else requires a registered USER. Visitors (anonymous) →
                        // 401 via the entry point; authenticated-but-insufficient (guest /
                        // preRegistration) → 403 via the access-denied handler (Inv 8).
                        .anyRequest().hasRole("USER"))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint())
                        .accessDeniedHandler(accessDeniedHandler()))
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                // OAuth2 login: our handler owns the post-success identity branching
                // (existing user / guest-upgrade / preRegistration) and cookie issuance.
                .oauth2Login(oauth -> oauth.successHandler(googleOAuth2SuccessHandler))
                // Resolve identity from the cookie just before authorization is checked.
                .addFilterBefore(cookieAuthenticationFilter, AuthorizationFilter.class)
                // Capture returnUrl on the OAuth redirect leg (Inv 2/3) before Spring's
                // redirect filter writes the 302 to Google.
                .addFilterBefore(oauthReturnUrlCaptureFilter, OAuth2AuthorizationRequestRedirectFilter.class)
                // Force the deferred CSRF token to materialise so the XSRF-TOKEN cookie is
                // written on safe requests (e.g. GET /me) for the SPA to read.
                .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
                // Wire the (otherwise unregistered) MDC filter so userId/traceId are logged
                // with the principal already resolved (see MdcLoggingFilter Javadoc).
                .addFilterAfter(new MdcLoggingFilter(), AuthorizationFilter.class);
        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(props.getCors().getFrontendOrigin()));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "X-XSRF-TOKEN", "X-Request-Id", "Accept"));
        config.setExposedHeaders(List.of("X-Request-Id"));
        config.setAllowCredentials(true); // required for cookie auth
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /** Anonymous (visitor) → 401: open the login modal. */
    private AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, ex) ->
                handlerExceptionResolver.resolveException(request, response, null, ex);
    }

    /** Authenticated but insufficient (guest / preRegistration) → 403: permission UI. */
    private AccessDeniedHandler accessDeniedHandler() {
        return (request, response, ex) ->
                handlerExceptionResolver.resolveException(request, response, null, ex);
    }

    /**
     * Triggers loading of the lazy {@link CsrfToken} so {@code CookieCsrfTokenRepository}
     * writes the {@code XSRF-TOKEN} cookie even on requests that never read the token
     * server-side. Runs after {@link CsrfFilter}, which sets the deferred token attribute.
     */
    static final class CsrfCookieFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                throws ServletException, IOException {
            CsrfToken token = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
            if (token != null) {
                token.getToken();
            }
            chain.doFilter(request, response);
        }
    }
}
