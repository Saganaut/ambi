package com.cephadex.ambi.user;

import java.time.Instant;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.user.enums.MembershipStatus;
import com.cephadex.ambi.user.enums.MembershipTier;
import com.cephadex.ambi.user.enums.PaymentProvider;

import lombok.Data;

@Data
public class BillingState {

    @Field("tier")
    private MembershipTier tier = MembershipTier.FREE;

    @Field("status")
    private MembershipStatus status = MembershipStatus.NONE;

    @Field("started_at")
    private Instant startedAt;

    @Field("current_period_end")
    private Instant currentPeriodEnd;

    @Field("cancel_at_period_end")
    private Boolean cancelAtPeriodEnd = false;

    @Field("payment_provider")
    private PaymentProvider paymentProvider = PaymentProvider.STRIPE;

    @Field("customer_id")
    private String customerId;

    @Field("subscription_id")
    private String subscriptionId;

}
