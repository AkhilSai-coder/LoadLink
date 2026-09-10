package com.routefill.enums;

public enum KycStatus {
    NONE,
    PENDING,
    VERIFIED,
    REJECTED;

    public static KycStatus fromString(String s) {
        if (s == null) return NONE;
        try {
            return KycStatus.valueOf(s.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return NONE;
        }
    }
}
