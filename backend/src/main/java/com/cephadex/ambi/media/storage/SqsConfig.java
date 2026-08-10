package com.cephadex.ambi.media.storage;

import java.net.URI;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;

/**
 * Builds the singleton {@link SqsClient} from {@link SqsProperties}. In dev this
 * points at the ElasticMQ container ({@code http://localhost:9324}) with static
 * placeholder credentials; in prod the endpoint override is omitted so the SDK
 * resolves the real AWS endpoint for the region.
 *
 * <p>Deliberate mirror of {@link S3Config}, with one documented deviation: when
 * no access key is configured the client falls back to
 * {@link DefaultCredentialsProvider}, so a deployed instance authenticates with
 * its IAM role instead of empty static credentials. {@code S3Config} has no such
 * fallback because Garage always needs an explicit key pair; the queue is the
 * one dependency expected to be a managed AWS service in production.
 *
 * <p>Constructing the client makes no network call, so it builds fine even when
 * the dev credentials are placeholders — failures only surface on the first
 * {@code sendMessage}.
 */
@Configuration
public class SqsConfig {

    @Bean
    SqsClient sqsClient(SqsProperties props) {
        var builder = SqsClient.builder()
                .region(Region.of(props.getRegion()))
                .credentialsProvider(credentials(props));
        // Endpoint override is dev/ElasticMQ-only; left unset, the SDK uses the
        // region's real AWS endpoint.
        if (StringUtils.hasText(props.getEndpoint())) {
            builder.endpointOverride(URI.create(props.getEndpoint()));
        }
        return builder.build();
    }

    private static AwsCredentialsProvider credentials(SqsProperties props) {
        if (!StringUtils.hasText(props.getAccessKey())) {
            return DefaultCredentialsProvider.create();
        }
        return StaticCredentialsProvider.create(
                AwsBasicCredentials.create(props.getAccessKey(), props.getSecretKey()));
    }
}
