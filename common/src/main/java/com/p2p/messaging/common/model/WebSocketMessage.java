package com.p2p.messaging.common.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Base WebSocket message model
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebSocketMessage {

    /**
     * Message type (CHAT, SIGNAL, STATUS, etc.)
     */
    private String type;

    /**
     * Sender's user ID
     */
    private String senderId;

    /**
     * Recipient's user ID
     */
    private String recipientId;

    /**
     * Message content
     */
    private String content;

    /**
     * Encrypted content (if applicable)
     */
    private String encryptedContent;

    /**
     * Message timestamp
     */
    private long timestamp;

    /**
     * Message ID
     */
    private String messageId;

    /**
     * Metadata
     */
    private Object metadata;
}