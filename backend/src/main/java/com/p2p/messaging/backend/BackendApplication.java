package com.p2p.messaging.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Main Spring Boot Application Entry Point
 */
@SpringBootApplication
public class BackendApplication {

    private static final Logger logger = LoggerFactory.getLogger(BackendApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);

        logger.info("====================================");
        logger.info("CipherChat Backend Started");
        logger.info("====================================");
        logger.info("WebSocket: ws://localhost:8080/ws");
        logger.info("API: http://localhost:8080/api");
        logger.info("Auth: http://localhost:8080/api/auth");
        logger.info("Health: http://localhost:8080/api/health");
        logger.info("====================================");
    }
}
