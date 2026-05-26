package com.cephadex.ambi.user.enums;

public enum UserLevel {
    GUEST(10),
    USER(20),
    PREMIUM_USER(30),
    ADMIN(100),
    SUPER_ADMIN(200);

    private final int weight;

    UserLevel(int weight) {
        this.weight = weight;
    }

    public int getWeight() {
        return this.weight;
    }

    public boolean hasAccessTo(UserLevel requiredLevel) {
        return this.weight >= requiredLevel.getWeight();
    }
}