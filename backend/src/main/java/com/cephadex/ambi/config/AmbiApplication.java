package com.cephadex.ambi.config;

import java.util.Date;
import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import jakarta.annotation.PostConstruct;

/**
 * Base packages are pinned to {@code com.cephadex.ambi} on every scanner. This
 * class lives in {@code com.cephadex.ambi.config} (the feature-folder layout),
 * but Spring Boot's default scans start at the annotated class's package — so
 * without these explicit base packages, {@code auth}/{@code user}/{@code billing}
 * etc. would silently be excluded from component scan and repository scan.
 */
@EnableMongoAuditing
@SpringBootApplication(scanBasePackages = "com.cephadex.ambi")
@ConfigurationPropertiesScan(basePackages = "com.cephadex.ambi")
@EnableMongoRepositories(basePackages = "com.cephadex.ambi")
@EnableScheduling
@EnableAsync
@EnableCaching
public class AmbiApplication {

	public static void main(String[] args) {
		SpringApplication.run(AmbiApplication.class, args);
	}

	@PostConstruct
	public void init() {
		TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
		System.out.println("Spring boot application running in UTC timezone :" + new Date());

	}
}
