package com.p2p.messaging.backend.controller;

import com.p2p.messaging.backend.model.UserSession;
import com.p2p.messaging.backend.service.AuthenticationService;
import com.p2p.messaging.common.model.AuthResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthenticationService authenticationService;

    @PostMapping("/key-login")
    public ResponseEntity<AuthResponse> keyLogin(@RequestBody Map<String, String> request) {
        try {
            String userId = request.get("userId");
            String publicKey = request.get("publicKey");
            String displayName = request.get("displayName");

            UserSession session = authenticationService.createKeySession(userId, publicKey, displayName);
            if (session == null) {
                return ResponseEntity.badRequest().body(
                        AuthResponse.builder()
                                .success(false)
                                .message("Invalid identity payload")
                                .build()
                );
            }

            return ResponseEntity.ok(
                    AuthResponse.builder()
                            .success(true)
                            .message("Identity session created")
                            .userId(session.getUserId())
                            .displayName(session.getDisplayName())
                            .publicKey(session.getPublicKey())
                            .sessionToken(session.getSessionToken())
                            .expiresIn(session.getExpiresAt() - System.currentTimeMillis())
                            .build()
            );
        } catch (Exception e) {
            logger.error("Error creating key session", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    AuthResponse.builder()
                            .success(false)
                            .message("Internal server error")
                            .build()
            );
        }
    }

    @GetMapping("/validate")
    public ResponseEntity<AuthResponse> validateSession(@RequestParam String token) {
        try {
            UserSession session = authenticationService.validateSession(token);
            if (session == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                        AuthResponse.builder()
                                .success(false)
                                .message("Invalid or expired session")
                                .build()
                );
            }

            return ResponseEntity.ok(
                    AuthResponse.builder()
                            .success(true)
                            .message("Session is valid")
                            .userId(session.getUserId())
                            .displayName(session.getDisplayName())
                            .publicKey(session.getPublicKey())
                            .sessionToken(session.getSessionToken())
                            .expiresIn(session.getExpiresAt() - System.currentTimeMillis())
                            .build()
            );
        } catch (Exception e) {
            logger.error("Error validating session", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    AuthResponse.builder()
                            .success(false)
                            .message("Internal server error")
                            .build()
            );
        }
    }

    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> getActiveUsers(@RequestParam String token) {
        try {
            UserSession session = authenticationService.validateSession(token);
            if (session == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                        Map.of("success", false, "message", "Invalid or expired session")
                );
            }

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "currentUser", session.getUserId(),
                            "users", authenticationService.getActiveUsers()
                    )
            );
        } catch (Exception e) {
            logger.error("Error getting active users", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    Map.of("success", false, "message", "Internal server error")
            );
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<AuthResponse> logout(@RequestParam String token) {
        try {
            boolean success = authenticationService.logout(token);
            if (!success) {
                return ResponseEntity.badRequest().body(
                        AuthResponse.builder()
                                .success(false)
                                .message("Invalid token")
                                .build()
                );
            }

            return ResponseEntity.ok(
                    AuthResponse.builder()
                            .success(true)
                            .message("Logged out successfully")
                            .build()
            );
        } catch (Exception e) {
            logger.error("Error logging out", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    AuthResponse.builder()
                            .success(false)
                            .message("Internal server error")
                            .build()
            );
        }
    }
}
