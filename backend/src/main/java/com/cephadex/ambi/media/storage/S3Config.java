package com.cephadex.ambi.media.storage;

import java.net.URI;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

/**
 * Builds the singleton {@link S3Client} from {@link S3Properties}. In dev this
 * points at the Garage container ({@code http://localhost:3900}) with static
 * credentials and path-style addressing; in prod the endpoint override is
 * omitted so the SDK resolves the real AWS endpoint for the region.
 *
 * <p>Constructing the client makes no network call, so it builds fine even when
 * the dev credentials are placeholders — failures only surface on the first
 * {@code putObject}/{@code getObject}.
 */
@Configuration
public class S3Config {

    @Bean
    S3Client s3Client(S3Properties props) {
        var builder = S3Client.builder()
                .region(Region.of(props.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(props.getAccessKey(), props.getSecretKey())))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(props.isPathStyleAccess())
                        .build());
        // Endpoint override is dev/Garage-only; left unset, the SDK uses the
        // region's real AWS endpoint.
        if (StringUtils.hasText(props.getEndpoint())) {
            builder.endpointOverride(URI.create(props.getEndpoint()));
        }
        return builder.build();
    }
}
