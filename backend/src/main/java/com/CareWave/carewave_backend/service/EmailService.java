package com.CareWave.carewave_backend.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;

    public void sendSimpleEmail(String toEmail, String subject, String body) {
        log.info("[EMAIL] Send started");
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("carewave.auth@gmail.com");
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);

            log.info("[EMAIL] SMTP connection attempt");
            mailSender.send(message);
            log.info("[EMAIL] Send successful");
        } catch (Exception e) {
            log.error("[EMAIL] Send failed (SMTP unconfigured or unreachable): {}", e.getMessage());
        }
    }
}
