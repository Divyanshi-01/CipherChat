package com.p2p.messaging.backend.controller;

import com.p2p.messaging.backend.config.WebSocketEventListener;
import com.p2p.messaging.backend.service.AuthenticationService;
import com.p2p.messaging.common.model.WebRTCMessage;
import com.p2p.messaging.common.util.ValidationUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Controller
public class WebSocketMessageController {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketMessageController.class);

    @Autowired
    private SimpMessageSendingOperations messagingTemplate;

    @Autowired
    private WebSocketEventListener eventListener;

    @Autowired
    private AuthenticationService authenticationService;

    private String validateUserFromToken(String token) {
        if (token == null || token.isEmpty()) {
            return null;
        }
        return authenticationService.getUserIdBySession(token);
    }

    @MessageMapping("/user/register")
    @SendTo("/topic/user-status")
    public WebRTCMessage registerUser(@Payload WebRTCMessage message, SimpMessageHeaderAccessor headerAccessor) {
        try {
            if (message == null) {
                logger.warn("Null message");
                return null;
            }

            String sessionToken = headerAccessor.getFirstNativeHeader("Authorization");
            String authenticatedUserId = validateUserFromToken(sessionToken);
            if (authenticatedUserId == null) {
                logger.warn("Unauthorized connection");
                return null;
            }

            message.setFrom(authenticatedUserId);
            message.setType("USER_REGISTERED");
            message.setTimestamp(System.currentTimeMillis());
            message.setStatus("ONLINE");

            String sessionId = headerAccessor.getSessionId();
            if (sessionId != null) {
                eventListener.registerUser(sessionId, authenticatedUserId);
            }

            logger.info("User registered: {}", authenticatedUserId);
            return message;
        } catch (Exception e) {
            logger.error("Error registering user", e);
            return null;
        }
    }

    @MessageMapping("/chat/send")
    public void sendChatMessage(@Payload WebRTCMessage message) {
        try {
            if (message == null || !ValidationUtil.isValidChatMessage(message)) {
                logger.warn("Invalid message");
                return;
            }

            message.setTimestamp(System.currentTimeMillis());
            message.setMessageId(java.util.UUID.randomUUID().toString());
            message.setType("CHAT");
            message.setEncrypted(true);

            messagingTemplate.convertAndSendToUser(
                    message.getTo(),
                    "/queue/messages",
                    message
            );

            logger.debug("Opaque websocket message sent from {} to {}", message.getFrom(), message.getTo());
        } catch (Exception e) {
            logger.error("Error sending message", e);
        }
    }

    @MessageMapping("/signal/offer")
    public void sendOffer(@Payload WebRTCMessage message) {
        try {
            if (message == null || !ValidationUtil.isValidOfferMessage(message)) {
                return;
            }

            message.setType("OFFER");
            message.setTimestamp(System.currentTimeMillis());

            messagingTemplate.convertAndSendToUser(
                    message.getTo(),
                    "/queue/signals",
                    message
            );
        } catch (Exception e) {
            logger.error("Error sending offer", e);
        }
    }

    @MessageMapping("/signal/answer")
    public void sendAnswer(@Payload WebRTCMessage message) {
        try {
            if (message == null || !ValidationUtil.isValidAnswerMessage(message)) {
                return;
            }

            message.setType("ANSWER");
            message.setTimestamp(System.currentTimeMillis());

            messagingTemplate.convertAndSendToUser(
                    message.getTo(),
                    "/queue/signals",
                    message
            );
        } catch (Exception e) {
            logger.error("Error sending answer", e);
        }
    }

    @MessageMapping("/signal/candidate")
    public void sendIceCandidate(@Payload WebRTCMessage message) {
        try {
            if (message == null || !ValidationUtil.isValidIceCandidateMessage(message)) {
                return;
            }

            message.setType("ICE_CANDIDATE");
            message.setTimestamp(System.currentTimeMillis());

            messagingTemplate.convertAndSendToUser(
                    message.getTo(),
                    "/queue/signals",
                    message
            );
        } catch (Exception e) {
            logger.error("Error sending candidate", e);
        }
    }

    @MessageMapping("/ping")
    public void handlePing(@Payload String data, SimpMessageHeaderAccessor headerAccessor) {
        try {
            String sessionId = headerAccessor.getSessionId();
            if (sessionId == null) {
                return;
            }

            String pongMessage = "PONG: " + LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME);

            messagingTemplate.convertAndSendToUser(
                    sessionId,
                    "/queue/pong",
                    pongMessage
            );
        } catch (Exception e) {
            logger.error("Error handling ping", e);
        }
    }
}
