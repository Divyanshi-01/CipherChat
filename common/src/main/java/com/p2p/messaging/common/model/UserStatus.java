package com.p2p.messaging.common.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * User online/offline status message
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserStatus {

    /**
     * User ID
     */
    private String userId;

    /**
     * User status (ONLINE, OFFLINE, IDLE, BUSY)
     */
    private String status;

    /**
     * User display name
     */
    private String displayName;

    /**
     * Status update timestamp
     */
    private long timestamp;

    /**
     * Optional status message
     */
    private String statusMessage;
}