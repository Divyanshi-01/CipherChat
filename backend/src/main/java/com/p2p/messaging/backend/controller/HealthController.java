package com.p2p.messaging.backend.controller;

import com.p2p.messaging.backend.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/health")
public class HealthController {

    @Autowired(required = false)
    private MessageService messageService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "CipherChat Backend");
        response.put("version", "1.0.0");
        response.put("timestamp", System.currentTimeMillis());

        if (messageService != null) {
            response.put("messageStats", messageService.getStats());
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> info() {
        Map<String, Object> response = new HashMap<>();
        response.put("service", "CipherChat");
        response.put("encryption", "X25519 + AES-GCM");
        response.put("protocol", "WebSocket + STOMP + REST API");
        response.put("identity", "Browser-managed key pair");
        response.put("messageHandling", "Ciphertext relay only");
        return ResponseEntity.ok(response);
    }
}
