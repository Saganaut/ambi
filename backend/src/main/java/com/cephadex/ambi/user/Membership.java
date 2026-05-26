package com.cephadex.ambi.user;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

import org.springframework.data.mongodb.core.mapping.Field;

import lombok.Data;

@Data
public class Membership {

    @Field("billing")
    private BillingState billing = new BillingState();

    @Field("source_organization_id")
    private String sourceOrganizationId;

    @Field("monthly_interactive_session_count")
    private int monthlyInteractiveSessionCount = 0;

    @Field("monthly_interactive_session_limit")
    private int monthlyInteractiveSessionLimit = 0;

    @Field("monthly_count_period_start")
    private Instant monthlyCountPeriodStart;

    @Field("quota_resets_at")
    private Instant quotaResetsAt;

    @Field("feature_flags")
    private Set<String> featureFlags = new LinkedHashSet<>();

}
