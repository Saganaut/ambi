package com.cephadex.ambi.media.storage;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.cephadex.ambi.common.exception.ValidationException;

/**
 * Fetches a user-supplied remote image URL server-side so the browser can load
 * it for client-side cropping without canvas CORS-taint, and so a pasted URL is
 * eventually stored as bytes (via the normal upload path) rather than kept as a
 * fragile external reference.
 *
 * <p>Because the URL is attacker-controlled, this is a classic SSRF surface. The
 * guards here, applied to the initial URL <em>and every redirect hop</em>:
 * <ul>
 *   <li>only {@code http}/{@code https} schemes;</li>
 *   <li>every resolved IP must be public — loopback, any-local, link-local
 *       (which covers the {@code 169.254.169.254} cloud metadata endpoint),
 *       site-local/RFC-1918, IPv6 unique-local ({@code fc00::/7}), and multicast
 *       addresses are all rejected;</li>
 *   <li>a bounded redirect chain (re-validated per hop, no auto-follow);</li>
 *   <li>response content-type must be an allowed image type;</li>
 *   <li>the body is read with a hard size cap and the client uses a short
 *       connect/read timeout.</li>
 * </ul>
 *
 * <p><strong>Residual caveat:</strong> this validates the address we resolve,
 * but {@link HttpClient} re-resolves on connect, leaving a narrow DNS-rebinding
 * (TOCTOU) window. Closing it fully would require pinning the connection to the
 * vetted IP; that is out of scope for this learning project and noted here so it
 * isn't mistaken for complete protection.
 */
@Service
public class RemoteImageService {

    private final MediaProperties props;
    private final HttpClient http;

    public RemoteImageService(MediaProperties props) {
        this.props = props;
        // Never auto-follow: we re-run the SSRF guards on each redirect target.
        this.http = HttpClient.newBuilder()
                .connectTimeout(props.getRemoteFetchTimeout())
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
    }

    /** The bytes and resolved content type of a fetched remote image. */
    public record RemoteImage(byte[] bytes, String contentType) {
    }

    /**
     * Resolve {@code rawUrl}, fetch it under the SSRF guards, and return its
     * bytes. Every failure mode surfaces as a {@link ValidationException} (400)
     * with a user-safe message — never an IP or internal detail.
     */
    public RemoteImage fetch(String rawUrl) {
        URI uri = parse(rawUrl);
        int redirectsLeft = props.getRemoteFetchMaxRedirects();

        while (true) {
            guardAddresses(uri);
            HttpResponse<InputStream> response = send(uri);
            int status = response.statusCode();

            if (status >= 300 && status < 400) {
                if (redirectsLeft-- <= 0) {
                    drain(response);
                    throw new ValidationException("The image URL redirects too many times.");
                }
                uri = redirectTarget(uri, response);
                drain(response);
                continue;
            }
            if (status != 200) {
                drain(response);
                throw new ValidationException("The image URL responded with status " + status + ".");
            }
            return readImage(response);
        }
    }

    /** Parse and scheme/host-validate a URL the user typed. */
    private static URI parse(String rawUrl) {
        if (!StringUtils.hasText(rawUrl)) {
            throw new ValidationException("Provide an image URL.");
        }
        URI uri;
        try {
            uri = new URI(rawUrl.trim());
        } catch (URISyntaxException e) {
            throw new ValidationException("That is not a valid URL.");
        }
        requireHttpHost(uri);
        return uri;
    }

    private static void requireHttpHost(URI uri) {
        if (!uri.isAbsolute() || uri.getHost() == null) {
            throw new ValidationException("The image URL must be an absolute http(s) URL.");
        }
        String scheme = uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("http") && !scheme.equals("https")) {
            throw new ValidationException("Only http and https image URLs are allowed.");
        }
    }

    /** Reject the request if any address the host resolves to is non-public. */
    private static void guardAddresses(URI uri) {
        InetAddress[] addresses;
        try {
            addresses = InetAddress.getAllByName(uri.getHost());
        } catch (UnknownHostException e) {
            throw new ValidationException("Could not resolve the image URL's host.");
        }
        for (InetAddress address : addresses) {
            if (isNonPublic(address)) {
                throw new ValidationException("That image URL points to a disallowed address.");
            }
        }
    }

    private static boolean isNonPublic(InetAddress address) {
        if (address.isAnyLocalAddress()
                || address.isLoopbackAddress()
                || address.isLinkLocalAddress()
                || address.isSiteLocalAddress()
                || address.isMulticastAddress()) {
            return true;
        }
        // Java's isSiteLocalAddress() does not flag IPv6 unique-local (fc00::/7),
        // so check it explicitly.
        byte[] octets = address.getAddress();
        return octets.length == 16 && (octets[0] & 0xFE) == 0xFC;
    }

    private HttpResponse<InputStream> send(URI uri) {
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(props.getRemoteFetchTimeout())
                .header("Accept", "image/*")
                .GET()
                .build();
        try {
            return http.send(request, HttpResponse.BodyHandlers.ofInputStream());
        } catch (IOException e) {
            throw new ValidationException("Could not fetch the image from that URL.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ValidationException("Fetching the image URL was interrupted.");
        }
    }

    /** Resolve (and re-validate the scheme/host of) a redirect's Location. */
    private static URI redirectTarget(URI from, HttpResponse<?> response) {
        String location = response.headers().firstValue("location").orElse(null);
        if (!StringUtils.hasText(location)) {
            throw new ValidationException("The image URL redirected without a destination.");
        }
        URI target = from.resolve(location.trim());
        requireHttpHost(target);
        return target;
    }

    private RemoteImage readImage(HttpResponse<InputStream> response) {
        String contentType = response.headers().firstValue("content-type").orElse("");
        String mediaType = contentType.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
        if (!props.getAllowedContentTypes().contains(mediaType)) {
            drain(response);
            throw new ValidationException(
                    "The URL did not return a supported image type. Allowed: "
                            + String.join(", ", props.getAllowedContentTypes()) + ".");
        }
        byte[] bytes = readBounded(response.body(), props.getMaxUploadBytes());
        return new RemoteImage(bytes, mediaType);
    }

    /** Read the stream up to {@code max} bytes, rejecting anything larger. */
    private static byte[] readBounded(InputStream in, long max) {
        try (in) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            long total = 0;
            int read;
            while ((read = in.read(buffer)) != -1) {
                total += read;
                if (total > max) {
                    throw new ValidationException(
                            "The remote image exceeds the maximum size of " + (max / (1024 * 1024)) + " MB.");
                }
                out.write(buffer, 0, read);
            }
            if (total == 0) {
                throw new ValidationException("The image URL returned an empty response.");
            }
            return out.toByteArray();
        } catch (IOException e) {
            throw new ValidationException("Could not read the image from that URL.");
        }
    }

    /** Close a response body we are not going to use (redirects / errors). */
    private static void drain(HttpResponse<InputStream> response) {
        try (InputStream body = response.body()) {
            body.readAllBytes();
        } catch (IOException ignored) {
            // Best-effort cleanup; nothing actionable if the close fails.
        }
    }
}
