package com.p2p.messaging.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Message model for storing messages (in-memory)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {
    private String messageId;
    private String from;
    private String to;
    private String ciphertext;
    private String nonce;
    private long timestamp;
    private boolean encrypted;
    private String status; // SENT, DELIVERED, READ
    private long keyVersion;
    private String senderPublicKey;
}
