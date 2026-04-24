package com.p2p.messaging.backend.controller;

import com.p2p.messaging.backend.model.Message;
import com.p2p.messaging.backend.service.AuthenticationService;
import com.p2p.messaging.backend.service.MessageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST controller for ciphertext relay and retrieval.
 */
@RestController
@RequestMapping("/messages")
@CrossOrigin(origins = "*")
public class MessageController {

    private static final Logger logger = LoggerFactory.getLogger(MessageController.class);

    @Autowired
    private MessageService messageService;

    @Autowired
    private AuthenticationService authenticationService;

    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> sendMessage(
            @RequestHeader(value = "Authorization", required = false) String token,
            @RequestBody Map<String, String> request) {
        try {
            String authenticatedUser = authenticationService.getUserIdBySession(token);
            String authenticatedPublicKey = authenticationService.getPublicKeyBySession(token);
            if (authenticatedUser == null || authenticatedPublicKey == null) {
                return ResponseEntity.status(401).body(
                        Map.of("success", false, "message", "Unauthorized")
                );
            }

            String to = request.get("to");
            String ciphertext = request.get("ciphertext");
            String nonce = request.get("nonce");
            String messageId = request.get("messageId");
            String senderPublicKey = request.get("senderPublicKey");
            long timestamp = parseLong(request.get("timestamp"));
            long keyVersion = parseLong(request.get("keyVersion"));

            if (isBlank(to) || isBlank(ciphertext) || isBlank(nonce) || isBlank(messageId) || isBlank(senderPublicKey)) {
                return ResponseEntity.badRequest().body(
                        Map.of("success", false, "message", "Ciphertext payload is incomplete")
                );
            }

            if (!authenticatedPublicKey.equals(senderPublicKey)) {
                return ResponseEntity.status(403).body(
                        Map.of("success", false, "message", "Sender public key mismatch")
                );
            }

            if (!isReasonableTimestamp(timestamp)) {
                return ResponseEntity.badRequest().body(
                        Map.of("success", false, "message", "Invalid message timestamp")
                );
            }

            Message message = messageService.saveMessage(
                    authenticatedUser,
                    to,
                    ciphertext,
                    nonce,
                    timestamp,
                    keyVersion,
                    senderPublicKey,
                    messageId
            );

            if (message == null) {
                return ResponseEntity.status(409).body(
                        Map.of("success", false, "message", "Duplicate or invalid message")
                );
            }

            logger.info("Ciphertext relayed: {} -> {}", authenticatedUser, to);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Message relayed");
            response.put("messageId", message.getMessageId());
            response.put("timestamp", message.getTimestamp());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error relaying message", e);
            return ResponseEntity.status(500).body(
                    Map.of("success", false, "message", "Internal error")
            );
        }
    }

    @GetMapping("/conversation/{otherUserId}")
    public ResponseEntity<Map<String, Object>> getConversation(
            @PathVariable String otherUserId,
            @RequestParam String token) {
        try {
            String authenticatedUser = authenticationService.getUserIdBySession(token);
            if (authenticatedUser == null) {
                return ResponseEntity.status(401).body(
                        Map.of("success", false, "message", "Unauthorized")
                );
            }

            List<Message> messages = messageService.getConversation(authenticatedUser, otherUserId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("userId", authenticatedUser);
            response.put("otherUserId", otherUserId);
            response.put("messages", messages);
            response.put("count", messages.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error getting conversation", e);
            return ResponseEntity.status(500).body(
                    Map.of("success", false, "message", "Internal error")
            );
        }
    }

    @GetMapping("/all")
    public ResponseEntity<Map<String, Object>> getAllConversations(@RequestParam String token) {
        try {
            String authenticatedUser = authenticationService.getUserIdBySession(token);
            if (authenticatedUser == null) {
                return ResponseEntity.status(401).body(
                        Map.of("success", false, "message", "Unauthorized")
                );
            }

            Map<String, List<Message>> conversations = messageService.getUserConversations(authenticatedUser);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("userId", authenticatedUser);
            response.put("conversations", conversations);
            response.put("conversationCount", conversations.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error getting conversations", e);
            return ResponseEntity.status(500).body(
                    Map.of("success", false, "message", "Internal error")
            );
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        try {
            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "stats", messageService.getStats()
                    )
            );
        } catch (Exception e) {
            logger.error("Error getting stats", e);
            return ResponseEntity.status(500).body(
                    Map.of("success", false, "message", "Internal error")
            );
        }
    }

    private long parseLong(String value) {
        try {
            return Long.parseLong(value);
        } catch (Exception ignored) {
            return -1;
        }
    }

    private boolean isReasonableTimestamp(long timestamp) {
        long now = System.currentTimeMillis();
        return timestamp > now - (7L * 24 * 60 * 60 * 1000) && timestamp < now + (5L * 60 * 1000);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
