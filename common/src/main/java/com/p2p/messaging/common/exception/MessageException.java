package com.p2p.messaging.common.exception;

/**
 * Exception for messaging operations
 */
public class MessageException extends RuntimeException {
    public MessageException(String message) {
        super(message);
    }

    public MessageException(String message, Throwable cause) {
        super(message, cause);
    }
}