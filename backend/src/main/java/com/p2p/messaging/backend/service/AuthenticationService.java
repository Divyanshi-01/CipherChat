package com.p2p.messaging.backend.service;

import com.p2p.messaging.backend.model.UserSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Service
public class AuthenticationService {

    private static final Logger logger = LoggerFactory.getLogger(AuthenticationService.class);
    private static final long SESSION_EXPIRY_TIME = 24 * 60 * 60 * 1000L;
    private static final Pattern USER_ID_PATTERN = Pattern.compile("^[a-f0-9]{16,64}$");

    private final Map<String, UserSession> sessionStore = new ConcurrentHashMap<>();

    public UserSession createKeySession(String userId, String publicKey, String displayName) {
        if (!isValidUserId(userId) || !isValidPublicKey(publicKey)) {
            logger.warn("Rejected identity login for invalid userId/publicKey");
            return null;
        }

        cleanupExpiredSessions();

        String sessionToken = UUID.randomUUID().toString();
        long now = System.currentTimeMillis();

        UserSession session = UserSession.builder()
                .userId(userId)
                .displayName(sanitizeDisplayName(displayName, userId))
                .publicKey(publicKey)
                .sessionToken(sessionToken)
                .createdAt(now)
                .expiresAt(now + SESSION_EXPIRY_TIME)
                .status("ACTIVE")
                .build();

        sessionStore.put(sessionToken, session);
        logger.info("Session created for identity {}", userId);
        return session;
    }

    public UserSession validateSession(String sessionToken) {
        if (sessionToken == null || sessionToken.isEmpty()) {
            return null;
        }

        UserSession session = sessionStore.get(sessionToken);
        if (session != null && session.isValid()) {
            return session;
        }

        if (session != null) {
            sessionStore.remove(sessionToken);
        }

        return null;
    }

    public String getUserIdBySession(String sessionToken) {
        UserSession session = validateSession(sessionToken);
        return session != null ? session.getUserId() : null;
    }

    public String getPublicKeyBySession(String sessionToken) {
        UserSession session = validateSession(sessionToken);
        return session != null ? session.getPublicKey() : null;
    }

    public boolean logout(String sessionToken) {
        return sessionStore.remove(sessionToken) != null;
    }

    public List<Map<String, String>> getActiveUsers() {
        cleanupExpiredSessions();

        Map<String, String> activeUsers = new LinkedHashMap<>();
        sessionStore.values().stream()
                .filter(UserSession::isValid)
                .sorted(Comparator.comparing(UserSession::getCreatedAt).reversed())
                .forEach(session -> activeUsers.putIfAbsent(session.getUserId(), session.getPublicKey()));

        List<Map<String, String>> result = new ArrayList<>();
        activeUsers.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                    .forEach(entry -> result.add(Map.of(
                        "userId", entry.getKey(),
                        "displayName", displayNameForUser(entry.getKey()),
                        "publicKey", entry.getValue()
                )));
        return result;
    }

    private void cleanupExpiredSessions() {
        long now = System.currentTimeMillis();
        sessionStore.entrySet().removeIf(entry -> entry.getValue() == null || entry.getValue().getExpiresAt() <= now);
    }

    private boolean isValidUserId(String userId) {
        return userId != null && USER_ID_PATTERN.matcher(userId).matches();
    }

    private boolean isValidPublicKey(String publicKey) {
        return publicKey != null && !publicKey.isBlank() && publicKey.length() <= 2048;
    }

    private String sanitizeDisplayName(String displayName, String userId) {
        if (displayName == null) {
            return defaultDisplayName(userId);
        }

        String trimmed = displayName.trim().replaceAll("\\s+", " ");
        if (trimmed.isEmpty()) {
            return defaultDisplayName(userId);
        }

        return trimmed.length() > 40 ? trimmed.substring(0, 40) : trimmed;
    }

    private String defaultDisplayName(String userId) {
        return "User " + userId.substring(0, Math.min(6, userId.length()));
    }

    private String displayNameForUser(String userId) {
        return sessionStore.values().stream()
                .filter(UserSession::isValid)
                .filter(session -> userId.equals(session.getUserId()))
                .sorted(Comparator.comparing(UserSession::getCreatedAt).reversed())
                .map(UserSession::getDisplayName)
                .findFirst()
                .orElse(defaultDisplayName(userId));
    }
}
