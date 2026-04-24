package com.p2p.messaging.backend.config;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

@Component
public class WebSocketEventListener {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketEventListener.class);

    private final Map<String, String> connectedUsers = new ConcurrentHashMap<>();
    private final SimpMessageSendingOperations messagingTemplate;

    public WebSocketEventListener(SimpMessageSendingOperations messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        String sessionId = (String) event.getMessage().getHeaders().get("simpSessionId");
        if (sessionId != null) {
            logger.info("WebSocket client connected: {}", sessionId);
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        String sessionId = (String) event.getMessage().getHeaders().get("simpSessionId");
        if (sessionId != null) {
            String userId = connectedUsers.remove(sessionId);
            logger.info("WebSocket client disconnected: {} (userId: {})", sessionId, userId);
        }
    }

    public void registerUser(String sessionId, String userId) {
        if (sessionId != null && userId != null) {
            connectedUsers.put(sessionId, userId);
            logger.info("User registered: {} (session: {})", userId, sessionId);
        }
    }

    public int getConnectedUsersCount() {
        return connectedUsers.size();
    }
}