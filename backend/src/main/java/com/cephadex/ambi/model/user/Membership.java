package com.cephadex.ambi.model.user;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

import lombok.Data;

@Data
public class Membership {
    private BillingState billing = new BillingState();
    private String sourceOrganizationId;

    private int monthlyInteractiveSessionCount = 0;
    private int monthlyInteractiveSessionLimit = 0;

    private Instant monthlyCountPeriodStart;
    private Instant quotaResetsAt;

    private Set<String> featureFlags = new LinkedHashSet<>();

}
