package com.p2p.messaging.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnBean(JavaMailSender.class)
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@cipherchat.local}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
        logger.info("EmailService initialized");
    }

    public boolean sendOtpEmail(String toEmail, String otp) {
        try {
            if (toEmail == null || toEmail.isEmpty()) {
                logger.warn("Recipient email is null");
                return false;
            }

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Your OTP - Valid for 5 minutes");
            message.setText(buildEmailContent(otp, toEmail));

            mailSender.send(message);
            logger.info("OTP email sent to: {}", toEmail);
            return true;
        } catch (Exception e) {
            logger.error("Error sending OTP email to: {}", toEmail, e);
            return false;
        }
    }

    private String buildEmailContent(String otp, String email) {
        return "CIPHERCHAT - OTP VERIFICATION\n\n" +
                "Hello " + email + ",\n\n" +
                "Your One-Time Password (OTP) is:\n\n" +
                "          " + otp + "\n\n" +
                "Valid for 5 minutes.\n\n" +
                "Security Notice:\n" +
                "- Never share your OTP\n" +
                "- All communications are encrypted\n\n" +
                "CipherChat Team\n" +
                "(c) 2024";
    }
}
