package com.p2p.messaging.backend.service;

import com.p2p.messaging.backend.model.Message;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service for message management
 * Stores only ciphertext and transport metadata in memory
 */
@Service
public class MessageService {

    private static final Logger logger = LoggerFactory.getLogger(MessageService.class);

    private final Map<String, List<Message>> messageStore = new ConcurrentHashMap<>();
    private final Set<String> seenMessageIds = ConcurrentHashMap.newKeySet();

    public Message saveMessage(String from, String to, String ciphertext, String nonce,
                               long timestamp, long keyVersion, String senderPublicKey,
                               String messageId) {
        try {
            if (!seenMessageIds.add(messageId)) {
                logger.warn("Duplicate message blocked: {}", messageId);
                return null;
            }

            String conversationId = getConversationId(from, to);

            Message message = Message.builder()
                    .messageId(messageId)
                    .from(from)
                    .to(to)
                    .ciphertext(ciphertext)
                    .nonce(nonce)
                    .timestamp(timestamp)
                    .encrypted(true)
                    .status("DELIVERED")
                    .keyVersion(keyVersion)
                    .senderPublicKey(senderPublicKey)
                    .build();

            messageStore.computeIfAbsent(
                    conversationId,
                    key -> Collections.synchronizedList(new ArrayList<>())
            ).add(message);

            logger.info("Ciphertext stored: {} from {} to {}", messageId, from, to);
            return message;
        } catch (Exception e) {
            logger.error("Error saving ciphertext", e);
            seenMessageIds.remove(messageId);
            return null;
        }
    }

    public List<Message> getConversation(String userId1, String userId2) {
        try {
            String conversationId = getConversationId(userId1, userId2);
            List<Message> messages = messageStore.getOrDefault(conversationId, new ArrayList<>());
            List<Message> sortedMessages = new ArrayList<>(messages);
            sortedMessages.sort(Comparator.comparingLong(Message::getTimestamp));
            logger.debug("Retrieved {} ciphertext messages for conversation: {}", sortedMessages.size(), conversationId);
            return sortedMessages;
        } catch (Exception e) {
            logger.error("Error getting conversation", e);
            return new ArrayList<>();
        }
    }

    public Map<String, List<Message>> getUserConversations(String userId) {
        try {
            Map<String, List<Message>> userConversations = new ConcurrentHashMap<>();

            messageStore.forEach((conversationId, messages) -> {
                String[] parts = conversationId.split(":");
                if (parts.length == 2 && (parts[0].equals(userId) || parts[1].equals(userId))) {
                    List<Message> sortedMessages = new ArrayList<>(messages);
                    sortedMessages.sort(Comparator.comparingLong(Message::getTimestamp));
                    userConversations.put(conversationId, sortedMessages);
                }
            });

            logger.debug("Retrieved {} conversations for user: {}", userConversations.size(), userId);
            return userConversations;
        } catch (Exception e) {
            logger.error("Error getting user conversations", e);
            return new ConcurrentHashMap<>();
        }
    }

    private String getConversationId(String userId1, String userId2) {
        if (userId1.compareTo(userId2) < 0) {
            return userId1 + ":" + userId2;
        }
        return userId2 + ":" + userId1;
    }

    public void clearAllMessages() {
        messageStore.clear();
        seenMessageIds.clear();
        logger.warn("All ciphertext messages cleared");
    }

    public Map<String, Integer> getStats() {
        Map<String, Integer> stats = new java.util.HashMap<>();
        stats.put("conversations", messageStore.size());
        int totalMessages = messageStore.values().stream().mapToInt(List::size).sum();
        stats.put("totalMessages", totalMessages);
        return stats;
    }
}
