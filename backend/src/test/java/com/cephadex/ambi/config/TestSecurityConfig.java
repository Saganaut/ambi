package com.cephadex.ambi.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Test-profile security: permits everything and disables CSRF so feature tests
 * exercise controllers without the real filter chain. The production
 * {@link com.cephadex.ambi.auth.config.SecurityConfig} is {@code @Profile("!test")}
 * and therefore excluded whenever this is active. CSRF itself is verified
 * against the real chain in {@code CsrfEnforcementTest}.
 */
@Configuration
@EnableWebSecurity
@Profile("test")
public class TestSecurityConfig {

    @Bean
    SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
