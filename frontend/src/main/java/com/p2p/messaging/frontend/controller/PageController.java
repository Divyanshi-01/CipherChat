package com.p2p.messaging.frontend.controller;

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
        model.addAttribute("pageTitle", "Login - CipherChat");
        return "login";
    }

    /**
     * Chat Page
     */
    @GetMapping("/chat")
    public String chat(Model model) {
        logger.info("Serving chat page");
        model.addAttribute("wsUrl", "ws://localhost:8080/ws");
        model.addAttribute("apiUrl", "http://localhost:8080/api");
        model.addAttribute("pageTitle", "Chat - CipherChat");
        return "chat";
    }
}
