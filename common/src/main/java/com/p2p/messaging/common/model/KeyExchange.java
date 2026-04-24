package com.p2p.messaging.common.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a key exchange operation between two users
 * Handles secure AES key transfer using RSA encryption
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KeyExchange {

    /**
     * Unique exchange ID
     */
    private String exchangeId;

    /**
     * Sender's user ID
     */
    private String senderId;

    /**
     * Receiver's user ID
     */
    private String receiverId;

    /**
     * Sender's RSA public key (Base64 encoded)
     * Receiver will use this to encrypt their AES key
     */
    private String senderPublicKey;

    /**
     * Receiver's RSA public key (Base64 encoded)
     * Sender uses this to encrypt the AES session key
     */
    private String receiverPublicKey;

    /**
     * Encrypted AES session key (RSA encrypted, Base64 encoded)
     * The AES key that will be used for message encryption
     */
    private String encryptedSessionKey;

    /**
     * Exchange status (PENDING, COMPLETED, FAILED)
     */
    private String status;

    /**
     * Exchange creation timestamp
     */
    private long createdAt;

    /**
     * Exchange completion timestamp
     */
    private long completedAt;

    /**
     * Exchange expiration timestamp (optional)
     */
    private long expiresAt;

    /**
     * Additional metadata (optional)
     */
    private String metadata;
}