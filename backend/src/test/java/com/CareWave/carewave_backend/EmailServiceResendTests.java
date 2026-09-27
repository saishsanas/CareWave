package com.CareWave.carewave_backend;

import com.CareWave.carewave_backend.service.EmailService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class EmailServiceResendTests {

    @Test
    public void testMissingApiKeyThrowsIllegalStateException() {
        EmailService emailService = new EmailService("", "onboarding@resend.dev", "CareWave");
        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> emailService.sendSimpleEmail("user@example.com", "Test Subject", "Test Body")
        );
        assertTrue(exception.getMessage().contains("RESEND_API_KEY missing"));
    }

    @Test
    public void testInvalidApiKeyThrowsRuntimeException() {
        EmailService emailService = new EmailService("re_invalid_key_123456789", "onboarding@resend.dev", "CareWave");
        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> emailService.sendSimpleEmail("user@example.com", "Test Subject", "Test Body")
        );
        assertTrue(exception.getMessage().contains("Failed to send email via Resend API"));
    }
}
