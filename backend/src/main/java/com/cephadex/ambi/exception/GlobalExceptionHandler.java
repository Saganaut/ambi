/**
 * Single source of truth for turning exceptions into HTTP error responses.
 * Every error leaves the API as an RFC 9457 {@code ProblemDetail}
 * (application/problem+json) with extension members {@code code}
 * (machine-readable), {@code traceId} (also written to the server log), and —
 * for validation — {@code errors[]}. 4xx {@code detail} is user-safe; 5xx
 * {@code detail} is a fixed generic string while the real exception is logged.
 *
 * Extends {@link ResponseEntityExceptionHandler} so Spring's own framework
 * exceptions (validation, unreadable body, unsupported method, …) funnel
 * through the same ProblemDetail shape via {@link #handleExceptionInternal}.
 * Supports BOTH the typed {@link ApiException} hierarchy (preferred) and the
 * legacy {@code ResponseStatusException} still thrown across the codebase, so
 * no big-bang refactor is required.
 *
 * See z-docs/features/exceptions.md and z-docs/rules/EXCEPTION-RULES.md.
 */
package com.cephadex.ambi.exception;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import com.cephadex.ambi.model.web.MdcLoggingFilter;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ── Typed application exceptions (preferred) ─────────────────────────────

    @ExceptionHandler(ApiException.class)
    public ProblemDetail handleApiException(ApiException ex, HttpServletRequest request) {
        if (ex.getStatus().is5xxServerError()) {
            return logAndMask(ex, ex.getStatus(), request);
        }
        return build(ex.getStatus(), ex.getCode(), ex.getMessage(), request);
    }

    // ── Legacy ResponseStatusException (still thrown widely) ─────────────────

    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail handleResponseStatus(ResponseStatusException ex, HttpServletRequest request) {
        HttpStatusCode status = ex.getStatusCode();
        if (status.is5xxServerError()) {
            return logAndMask(ex, status, request);
        }
        String detail = ex.getReason() != null ? ex.getReason() : titleFor(status);
        return build(status, ApiErrors.defaultCodeFor(status), detail, request);
    }

    // ── Spring Security ──────────────────────────────────────────────────────

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        return build(HttpStatus.FORBIDDEN, "FORBIDDEN", "You do not have access to this resource", request);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ProblemDetail handleAuthentication(AuthenticationException ex, HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication is required", request);
    }

    // ── Param-level bean validation (@Validated on params/path/query) ────────

    @ExceptionHandler(ConstraintViolationException.class)
    public ProblemDetail handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest request) {
        List<Map<String, String>> errors = ex.getConstraintViolations().stream()
                .map(v -> Map.of(
                        "field", lastNode(v.getPropertyPath().toString()),
                        "message", v.getMessage()))
                .toList();
        ProblemDetail pd = build(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Request validation failed", request);
        pd.setTitle("Validation Failed");
        pd.setProperty("errors", errors);
        return pd;
    }

    // ── Catch-all → 500, nothing leaked ──────────────────────────────────────

    @ExceptionHandler(Throwable.class)
    public ProblemDetail handleUnexpected(Throwable ex, HttpServletRequest request) {
        return logAndMask(ex, HttpStatus.INTERNAL_SERVER_ERROR, request);
    }

    // ── Body bean validation (@Valid @RequestBody) — base-class override ─────

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        List<Map<String, String>> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> Map.of(
                        "field", fe.getField(),
                        "message", fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "invalid"))
                .toList();
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Request validation failed");
        pd.setTitle("Validation Failed");
        pd.setProperty("code", "VALIDATION_FAILED");
        pd.setProperty("errors", errors);
        return handleExceptionInternal(ex, pd, headers, HttpStatus.BAD_REQUEST, request);
    }

    // ── Stamp every framework-produced ProblemDetail with code/traceId/instance ─

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex, Object body, HttpHeaders headers,
            HttpStatusCode statusCode, WebRequest request) {
        if (body instanceof ProblemDetail pd) {
            if (pd.getProperties() == null || !pd.getProperties().containsKey("code")) {
                pd.setProperty("code", ApiErrors.defaultCodeFor(statusCode));
            }
            pd.setProperty("traceId", currentTraceId());
            if (request instanceof ServletWebRequest swr) {
                pd.setInstance(URI.create(swr.getRequest().getRequestURI()));
            }
        }
        return super.handleExceptionInternal(ex, body, headers, statusCode, request);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /**
     * Logs the full exception with the traceId, then returns a leak-free 5xx body.
     */
    private ProblemDetail logAndMask(Throwable ex, HttpStatusCode status, HttpServletRequest request) {
        String traceId = currentTraceId();
        log.error("Server error [traceId={}] {} {}", traceId, request.getMethod(), request.getRequestURI(), ex);
        return build(status, "INTERNAL_ERROR", ApiErrors.GENERIC_5XX_MESSAGE, request);
    }

    private ProblemDetail build(HttpStatusCode status, String code, String detail, HttpServletRequest request) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setTitle(titleFor(status));
        pd.setProperty("code", code);
        pd.setProperty("traceId", currentTraceId());
        pd.setInstance(URI.create(request.getRequestURI()));
        return pd;
    }

    private static String titleFor(HttpStatusCode status) {
        HttpStatus resolved = HttpStatus.resolve(status.value());
        return resolved != null ? resolved.getReasonPhrase() : "Error";
    }

    private static String lastNode(String propertyPath) {
        int dot = propertyPath.lastIndexOf('.');
        return dot >= 0 ? propertyPath.substring(dot + 1) : propertyPath;
    }

    /**
     * Reads the {@code traceId} from the SLF4J MDC if a tracing layer set one,
     * otherwise generates a short hex token and writes it back so any log lines
     * on this request share it. When real distributed tracing is wired (see
     * z-docs/infrastructure) this transparently picks up the propagated id.
     */
    private static String currentTraceId() {
        String id = MDC.get(MdcLoggingFilter.TRACE_ID);
        if (id == null || id.isBlank()) {
            id = Long.toHexString(ThreadLocalRandom.current().nextLong());
            MDC.put(MdcLoggingFilter.TRACE_ID, id);
        }
        return id;
    }
}
