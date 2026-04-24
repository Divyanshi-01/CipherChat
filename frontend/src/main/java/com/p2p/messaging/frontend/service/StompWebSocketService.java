package com.p2p.messaging.frontend.service;

import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * STOMP WebSocket service for frontend
 * Provides configuration and utilities for WebSocket communication
 */
@Service
public class StompWebSocketService {

    private static final Logger logger = LoggerFactory.getLogger(StompWebSocketService.class);

    public static final String WS_URL = "ws://localhost:8080/ws";
    public static final String OFFER_TOPIC = "/topic/offer";
    public static final String ANSWER_TOPIC = "/topic/answer";
    public static final String CANDIDATE_TOPIC = "/topic/candidate";

    public static final String OFFER_ENDPOINT = "/app/offer";
    public static final String ANSWER_ENDPOINT = "/app/answer";
    public static final String CANDIDATE_ENDPOINT = "/app/candidate";

    public StompWebSocketService() {
        logger.info("StompWebSocketService initialized");
    }

    /**
     * Get WebSocket configuration as JSON string
     */
    public String getWebSocketConfig() {
        return "{\n" +
                "  \"wsUrl\": \"" + WS_URL + "\",\n" +
                "  \"topics\": {\n" +
                "    \"offer\": \"" + OFFER_TOPIC + "\",\n" +
                "    \"answer\": \"" + ANSWER_TOPIC + "\",\n" +
                "    \"candidate\": \"" + CANDIDATE_TOPIC + "\"\n" +
                "  },\n" +
                "  \"endpoints\": {\n" +
                "    \"offer\": \"" + OFFER_ENDPOINT + "\",\n" +
                "    \"answer\": \"" + ANSWER_ENDPOINT + "\",\n" +
                "    \"candidate\": \"" + CANDIDATE_ENDPOINT + "\"\n" +
                "  }\n" +
                "}";
    }
}