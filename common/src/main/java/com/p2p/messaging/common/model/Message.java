package com.p2p.messaging.common.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Message model for P2P messaging
 * Stores encrypted message content
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    /**
     * Unique message identifier
     */
    private String id;

    /**
     * Sender's user ID
     */
    private String senderId;

    /**
     * Sender's display name
     */
    private String senderName;

    /**
     * Recipient's user ID
     */
    private String recipientId;

    /**
     * Encrypted message content (Base64 encoded)
     * Format: [IV (12 bytes) | Ciphertext | Auth Tag (16 bytes)] - all Base64 encoded
     */
    private String encryptedContent;

    /**
     * Plaintext content (only for temporary use in UI)
     * Will be filled after decryption
     */
    private transient String plainContent;

    /**
     * Message creation timestamp (milliseconds)
     */
    private long timestamp;

    /**
     * Whether the message has been read by recipient
     */
    private boolean read;

    /**
     * Message type (TEXT, IMAGE, FILE, etc.)
     */
    private String type;

    /**
     * Message status (SENT, DELIVERED, READ, FAILED)
     */
    private String status;

    /**
     * Key exchange ID used for this message (if applicable)
     */
    private String keyExchangeId;
}