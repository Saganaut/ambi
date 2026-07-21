package com.cephadex.ambi.media.storage;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import com.cephadex.ambi.common.exception.ValidationException;

/**
 * SSRF-guard coverage for the remote-image proxy. The guard lives in
 * {@link RemoteImageService} (the {@code RemoteImageController} is a thin
 * delegating shell), so it is exercised directly here.
 *
 * <p>Every case below is rejected <em>before</em> any socket is opened — either
 * at URL parse/scheme validation or at address resolution (loopback, link-local,
 * private, etc.). Because {@code guardAddresses} runs ahead of the HTTP send,
 * these assertions are fully offline and deterministic: literal IPs need no DNS,
 * and {@code 127.0.0.1}/{@code localhost} resolve locally. We deliberately do
 * <em>not</em> assert a happy-path fetch, which would require reaching a public
 * host over the network.
 */
class RemoteImageServiceTest {

    private final RemoteImageService service = new RemoteImageService(new MediaProperties());

    private void assertRejected(String url) {
        assertThatThrownBy(() -> service.fetch(url)).isInstanceOf(ValidationException.class);
    }

    @Test
    void blankUrlIsRejected() {
        assertRejected("");
        assertRejected("   ");
    }

    @Test
    void nonHttpSchemesAreRejected() {
        assertRejected("ftp://example.com/image.png");
        assertRejected("file:///etc/passwd");
        assertRejected("gopher://example.com/");
        assertRejected("data:image/png;base64,AAAA");
    }

    @Test
    void relativeOrHostlessUrlsAreRejected() {
        assertRejected("/images/logo.png");
        assertRejected("http:///nohost");
    }

    @Test
    void loopbackAddressesAreRejected() {
        assertRejected("http://127.0.0.1/image.png");
        assertRejected("http://localhost/image.png");
        assertRejected("http://[::1]/image.png");
    }

    @Test
    void cloudMetadataLinkLocalIsRejected() {
        // The classic SSRF target: the 169.254.169.254 metadata endpoint is
        // link-local, so it must never be reachable through the proxy.
        assertRejected("http://169.254.169.254/latest/meta-data/");
    }

    @Test
    void privateAndSiteLocalAddressesAreRejected() {
        assertRejected("http://10.0.0.1/image.png");
        assertRejected("http://192.168.1.1/image.png");
        assertRejected("http://172.16.0.1/image.png");
    }

    @Test
    void anyLocalAddressIsRejected() {
        assertRejected("http://0.0.0.0/image.png");
    }

    @Test
    void ipv6UniqueLocalIsRejected() {
        // fc00::/7 — Java's isSiteLocalAddress() misses these, so the guard
        // checks the leading octet explicitly.
        assertRejected("http://[fd00::1]/image.png");
    }
}
