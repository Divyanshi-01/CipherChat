package com.p2p.messaging.frontend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Frontend Page Controller
 */
@Controller
public class PageController {

    private static final Logger logger = LoggerFactory.getLogger(PageController.class);
    private final String backendBaseUrl;

    public PageController(@Value("${app.backend-base-url:http://localhost:8080}") String backendBaseUrl) {
        this.backendBaseUrl = normalizeBaseUrl(backendBaseUrl);
    }

    /**
     * Home/Index Page
     */
    @GetMapping("/")
    public String index(Model model) {
        logger.info("Serving index page");
        model.addAttribute("pageTitle", "CipherChat");
        model.addAttribute("appVersion", "1.0.0");
        return "index";
    }

    /**
     * Login Page
     */
    @GetMapping("/login")
    public String login(Model model) {
        logger.info("Serving login page");
        model.addAttribute("apiUrl", apiUrl());
        model.addAttribute("pageTitle", "Login - CipherChat");
        return "login";
    }

    /**
     * Chat Page
     */
    @GetMapping("/chat")
    public String chat(Model model) {
        logger.info("Serving chat page");
        model.addAttribute("wsUrl", wsUrl());
        model.addAttribute("apiUrl", apiUrl());
        model.addAttribute("pageTitle", "Chat - CipherChat");
        return "chat";
    }

    private String apiUrl() {
        return backendBaseUrl + "/api";
    }

    private String wsUrl() {
        if (backendBaseUrl.startsWith("https://")) {
            return "wss://" + backendBaseUrl.substring("https://".length()) + "/ws";
        }

        if (backendBaseUrl.startsWith("http://")) {
            return "ws://" + backendBaseUrl.substring("http://".length()) + "/ws";
        }

        return backendBaseUrl + "/ws";
    }

    private String normalizeBaseUrl(String value) {
        if (value == null || value.isBlank()) {
            return "http://localhost:8080";
        }

        String trimmed = value.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }
}
