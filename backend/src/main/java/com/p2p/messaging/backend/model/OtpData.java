package com.p2p.messaging.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@AllArgsConstructor
@Builder
public class OtpData {
    private String email;
    private String otp;
    private long createdAt;
    private long expiresAt;
    private int attempts;

    public boolean isExpired() {
        return System.currentTimeMillis() > expiresAt;
    }

    public boolean isAttemptsExceeded() {
        return attempts > 3;
    }
}