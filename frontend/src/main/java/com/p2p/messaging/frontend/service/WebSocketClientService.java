package com.p2p.messaging.frontend.service;

import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * WebSocket Client Service for frontend
 * Provides JavaScript interface for WebSocket communication
 */
@Service
public class WebSocketClientService {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketClientService.class);

    public WebSocketClientService() {
        logger.info("WebSocket Client Service initialized");
    }

    /**
     * Get WebSocket configuration
     */
    public String getWebSocketConfig() {
        return "{\n" +
                "  \"wsUrl\": \"http://localhost:8080/ws\",\n" +
                "  \"brokerUrl\": \"/broker\",\n" +
                "  \"appPrefix\": \"/app\",\n" +
                "  \"userPrefix\": \"/user\",\n" +
                "  \"topics\": [\n" +
                "    \"/topic/chat\",\n" +
                "    \"/topic/user-status\",\n" +
                "    \"/topic/notifications\"\n" +
                "  ],\n" +
                "  \"queues\": [\n" +
                "    \"/queue/messages\",\n" +
                "    \"/queue/signals\",\n" +
                "    \"/queue/typing\",\n" +
                "    \"/queue/pong\"\n" +
                "  ]\n" +
                "}";
    }
}