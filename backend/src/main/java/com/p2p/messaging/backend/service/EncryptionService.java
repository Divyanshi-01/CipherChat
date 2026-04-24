package com.p2p.messaging.backend.service;

import com.p2p.messaging.common.crypto.CryptoUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.security.KeyPair;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

@Service
public class EncryptionService {

    private static final Logger logger = LoggerFactory.getLogger(EncryptionService.class);

    private final Map<String, KeyPair> userKeyPairs = new ConcurrentHashMap<>();
    private final Map<String, SecretKey> sessionKeys = new ConcurrentHashMap<>();

    public KeyPair generateUserKeyPair(String userId) {
        try {
            KeyPair keyPair = CryptoUtil.generateRSAKeyPair();
            userKeyPairs.put(userId, keyPair);
            logger.info("Generated RSA key pair for: {}", userId);
            return keyPair;
        } catch (Exception e) {
            logger.error("Error generating key pair", e);
            return null;
        }
    }

    public String encryptMessage(String plainContent, String userId1, String userId2) {
        try {
            if (plainContent == null || plainContent.isEmpty()) {
                throw new IllegalArgumentException("Content cannot be empty");
            }

            String conversationId = getConversationId(userId1, userId2);
            SecretKey key = sessionKeys.computeIfAbsent(conversationId, k -> {
                try {
                    return CryptoUtil.generateAESKey();
                } catch (Exception e) {
                    logger.error("Error generating AES key", e);
                    return null;
                }
            });

            if (key == null) {
                return null;
            }

            return CryptoUtil.encrypt(plainContent, key);
        } catch (Exception e) {
            logger.error("Error encrypting message", e);
            return null;
        }
    }

    public String decryptMessage(String encryptedContent, String userId1, String userId2) {
        try {
            String conversationId = getConversationId(userId1, userId2);
            SecretKey key = sessionKeys.get(conversationId);

            if (key == null) {
                logger.warn("No session key found for conversation");
                return null;
            }

            return CryptoUtil.decrypt(encryptedContent, key);
        } catch (Exception e) {
            logger.error("Error decrypting message", e);
            return null;
        }
    }

    private String getConversationId(String userId1, String userId2) {
        if (userId1.compareTo(userId2) < 0) {
            return userId1 + ":" + userId2;
        }
        return userId2 + ":" + userId1;
    }
}