package com.p2p.messaging.common.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * WebRTC Signaling message for peer-to-peer communication setup
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignalingMessage {

    /**
     * Signaling message type (OFFER, ANSWER, ICE_CANDIDATE, REGISTER, etc.)
     */
    private String type;

    /**
     * Sender's user ID
     */
    private String from;

    /**
     * Receiver's user ID
     */
    private String to;

    /**
     * SDP offer
     */
    private String sdpOffer;

    /**
     * SDP answer
     */
    private String sdpAnswer;

    /**
     * ICE candidate
     */
    private IceCandidate iceCandidate;

    /**
     * Call/Signal ID
     */
    private String callId;

    /**
     * Signal timestamp
     */
    private long timestamp;

    /**
     * Error message (if applicable)
     */
    private String error;

    /**
     * Nested ICE Candidate class
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IceCandidate {
        private String candidate;
        private String sdpMLineIndex;
        private String sdpMid;
    }
}