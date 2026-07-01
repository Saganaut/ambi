package com.cephadex.ambi.auth.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * A dedicated, high-priority security chain scoped to {@code /api/dev/**}, active
 * only under the {@code DEV} profile. Higher {@link Order} than the un-ordered
 * main {@link SecurityConfig} chain so it wins for the dev routes; CSRF is
 * disabled there so headless tooling can POST {@code /api/dev/login} without first
 * fetching an XSRF token. Because the whole bean is {@code @Profile("DEV")}, none
 * of this exists in production — the main chain is the only chain there.
 */
@Configuration
@EnableWebSecurity
@Profile("DEV")
public class DevSecurityConfig {

    @Bean
    @Order(1)
    SecurityFilterChain devFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/api/dev/**")
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
