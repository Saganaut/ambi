package com.cephadex.ambi.config;

import java.io.IOException;
import java.util.UUID;

import org.slf4j.MDC;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import com.cephadex.ambi.common.exception.GlobalExceptionHandler;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Populates the SLF4J MDC with a per-request {@code traceId} and the
 * authenticated {@code userId} so every log line emitted while handling a
 * request can be correlated (see z-docs/decisions/001-observability-stack.md).
 *
 * WHY THIS EXISTS: the frontend stamps each API call with an
 * {@code X-Request-Id}
 * header. This filter adopts that id (or mints one when absent), exposes it
 * back
 * on the response so the browser/devtools can show it, and pins it into the MDC
 * as {@code traceId}. logback-spring.xml emits the MDC on every record, and
 * {@link GlobalExceptionHandler} echoes the {@code traceId} in error bodies —
 * so
 * a single id ties a user action to its server-side log lines (and, later, its
 * Sentry issue).
 *
 * It is registered by SecurityConfig via {@code addFilterAfter(..,
 * AuthorizationFilter.class)} so the authenticated principal is already
 * resolved
 * by the time {@code userId} is read. {@code userId} is the principal name
 * (cheap, DB-free); guests/anonymous requests log without it.
 */
public class MdcLoggingFilter extends OncePerRequestFilter {

    public static final String REQUEST_ID_HEADER = "X-Request-Id";
    public static final String TRACE_ID = "traceId";
    public static final String USER_ID = "userId";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String traceId = request.getHeader(REQUEST_ID_HEADER);
        if (traceId == null || traceId.isBlank()) {
            traceId = UUID.randomUUID().toString();
        }
        MDC.put(TRACE_ID, traceId);
        response.setHeader(REQUEST_ID_HEADER, traceId);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
            MDC.put(USER_ID, auth.getName());
        }

        try {
            chain.doFilter(request, response);
        } finally {
            // MDC is thread-local and threads are pooled — always clear it so the
            // ids never bleed into the next request served by the same thread.
            MDC.remove(TRACE_ID);
            MDC.remove(USER_ID);
        }
    }
}
