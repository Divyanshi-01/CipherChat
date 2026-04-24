package com.p2p.messaging.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSession {
    private String userId;
    private String displayName;
    private String publicKey;
    private String sessionToken;
    private long createdAt;
    private long expiresAt;
    private String status;

    public boolean isValid() {
        return System.currentTimeMillis() < expiresAt && "ACTIVE".equals(status);
    }
}
