package com.p2p.messaging.frontend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Frontend Application Main Entry Point
 */
@SpringBootApplication
public class FrontendApplication {

    private static final Logger logger = LoggerFactory.getLogger(FrontendApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(FrontendApplication.class, args);

        logger.info("====================================");
        logger.info("CipherChat Frontend Started");
        logger.info("====================================");
        logger.info("Home Page: http://localhost:8081/");
        logger.info("Chat Page: http://localhost:8081/chat");
        logger.info("====================================");
    }
}
