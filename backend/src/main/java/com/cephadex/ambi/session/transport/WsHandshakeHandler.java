package com.cephadex.ambi.session.transport;

import java.security.Principal;
import java.util.Map;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

/**
 * Binds the authenticated principal to the WebSocket session at handshake time.
 * The HTTP upgrade carries the {@code AMBI_AT} cookie, so the
 * {@code CookieAuthenticationFilter} has already populated the
 * {@code SecurityContext} (for guests too) by the time this runs; we capture that
 * {@link Authentication} as the session's user {@link Principal} so it persists
 * for the connection and is readable in the subscribe interceptor. Falls back to
 * the default (the servlet request principal) if no usable authentication is
 * present — anonymous yields no principal, which the interceptor then rejects.
 */
public class WsHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(ServerHttpRequest request, WebSocketHandler wsHandler,
            Map<String, Object> attributes) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
            return auth;
        }
        return super.determineUser(request, wsHandler, attributes);
    }
}
