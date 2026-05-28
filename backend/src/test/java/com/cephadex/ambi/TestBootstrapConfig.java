package com.cephadex.ambi;

import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;

/**
 * Anchors {@code @SpringBootConfiguration} at the {@code com.cephadex.ambi} test
 * package root so Spring Boot's <em>upward</em> package search can locate a
 * config from any test in this tree. The real {@code @SpringBootApplication}
 * lives in {@code com.cephadex.ambi.config.AmbiApplication}, which is a
 * sibling/child of the test packages rather than an ancestor — so the upward
 * search would otherwise fail (it never descends).
 *
 * <p>{@code @EnableAutoConfiguration} is needed because slice tests
 * ({@code @WebMvcTest}) rely on auto-config (MVC, Security) being enabled —
 * they then apply their own filter to limit auto-config to the slice. A bare
 * {@code @SpringBootConfiguration} leaves the slice with no MVC handler
 * mapping and {@code /api/...} returns 404. No {@code @ComponentScan} on
 * purpose: slice tests don't want a full app context. Tests that need the full
 * context name {@code AmbiApplication.class} explicitly via
 * {@code @SpringBootTest(classes = …)}.
 */
@SpringBootConfiguration
@EnableAutoConfiguration
public class TestBootstrapConfig {
}
