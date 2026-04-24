package com.p2p.messaging.common.util;

import com.p2p.messaging.common.model.WebRTCMessage;

/**
 * Validation utility for messages
 */
public class ValidationUtil {

    /**
     * Validate WebRTC message
     */
    public static boolean isValidMessage(WebRTCMessage message) {
        if (message == null) {
            return false;
        }

        if (message.getType() == null || message.getType().isEmpty()) {
            return false;
        }

        if (message.getFrom() == null || message.getFrom().isEmpty()) {
            return false;
        }

        return true;
    }

    /**
     * Validate chat message
     */
    public static boolean isValidChatMessage(WebRTCMessage message) {
        if (!isValidMessage(message)) {
            return false;
        }

        if (message.getContent() == null || message.getContent().trim().isEmpty()) {
            return false;
        }

        if (message.getTo() == null || message.getTo().isEmpty()) {
            return false;
        }

        return true;
    }

    /**
     * Validate offer message
     */
    public static boolean isValidOfferMessage(WebRTCMessage message) {
        if (!isValidMessage(message)) {
            return false;
        }

        if (message.getSdpOffer() == null || message.getSdpOffer().isEmpty()) {
            return false;
        }

        if (message.getTo() == null || message.getTo().isEmpty()) {
            return false;
        }

        return true;
    }

    /**
     * Validate answer message
     */
    public static boolean isValidAnswerMessage(WebRTCMessage message) {
        if (!isValidMessage(message)) {
            return false;
        }

        if (message.getSdpAnswer() == null || message.getSdpAnswer().isEmpty()) {
            return false;
        }

        if (message.getTo() == null || message.getTo().isEmpty()) {
            return false;
        }

        return true;
    }

    /**
     * Validate ICE candidate message
     */
    public static boolean isValidIceCandidateMessage(WebRTCMessage message) {
        if (!isValidMessage(message)) {
            return false;
        }

        if (message.getCandidate() == null) {
            return false;
        }

        if (message.getCandidate().getCandidate() == null ||
                message.getCandidate().getCandidate().isEmpty()) {
            return false;
        }

        if (message.getTo() == null || message.getTo().isEmpty()) {
            return false;
        }

        return true;
    }
}