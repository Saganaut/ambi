package com.cephadex.ambi.model.user;

import java.time.Instant;

import com.cephadex.ambi.model.enums.user.MembershipStatus;
import com.cephadex.ambi.model.enums.user.MembershipTier;
import com.cephadex.ambi.model.enums.user.PaymentProvider;

import lombok.Data;

@Data
public class BillingState {
    private MembershipTier tier = MembershipTier.FREE;
    private MembershipStatus status = MembershipStatus.NONE;
    private Instant startedAt;
    private Instant currentPeriodEnd;
    private Boolean cancelAtPeriodEnd = false;
    private PaymentProvider paymentProvider = PaymentProvider.STRIPE;
    private String customerId;
    private String subscriptionId;

}
