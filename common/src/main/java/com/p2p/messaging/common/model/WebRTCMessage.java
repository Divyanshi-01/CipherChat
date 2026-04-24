package com.p2p.messaging.common.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Unified WebRTC Message Model
 * Handles all message types: signaling, chat, status, calls
 * Single source of truth for all communication
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class WebRTCMessage {

    /**
     * Message type:
     * - OFFER: WebRTC SDP offer
     * - ANSWER: WebRTC SDP answer
     * - ICE_CANDIDATE: ICE candidate for connection
     * - CHAT: Text message
     * - TYPING: User is typing
     * - STOP_TYPING: User stopped typing
     * - CALL_INITIATE: Initiate call
     * - CALL_ACCEPT: Accept call
     * - CALL_REJECT: Reject call
     * - CALL_END: End call
     * - AUDIO_ENABLE: Enable audio
     * - AUDIO_DISABLE: Disable audio
     * - VIDEO_ENABLE: Enable video
     * - VIDEO_DISABLE: Disable video
     * - USER_STATUS: User status update
     * - REGISTER: User registration
     */
    private String type;

    /**
     * Sender's user ID
     */
    private String from;

    /**
     * Recipient's user ID
     */
    private String to;

    /**
     * Message content (for chat messages)
     */
    private String content;

    /**
     * Encrypted message content (Base64 encoded)
     */
    private String encryptedContent;

    /**
     * SDP offer (for OFFER type)
     */
    private String sdpOffer;

    /**
     * SDP answer (for ANSWER type)
     */
    private String sdpAnswer;

    /**
     * ICE candidate object
     */
    private IceCandidate candidate;

    /**
     * Unique message ID
     */
    private String messageId;

    /**
     * Call ID (for call-related messages)
     */
    private String callId;

    /**
     * Message timestamp (milliseconds)
     */
    private long timestamp;

    /**
     * Encryption status
     */
    private boolean encrypted;

    /**
     * Message delivery status
     */
    private String status;

    /**
     * Additional metadata
     */
    private Object metadata;

    /**
     * ICE Candidate inner class
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class IceCandidate {
        private String candidate;
        private Integer sdpMLineIndex;
        private String sdpMid;
    }

    /**
     * User Status inner class
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserStatus {
        private String userId;
        private String displayName;
        private String status; // ONLINE, OFFLINE, IDLE, BUSY
        private long timestamp;
    }
}