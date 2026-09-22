package com.CareWave.carewave_backend;

import com.CareWave.carewave_backend.service.OtpService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

public class EmailOtpSystemTests {

    private OtpService otpService;
    private final String email = "test@example.com";

    @BeforeEach
    public void setUp() {
        otpService = new OtpService();
    }

    @Test
    public void testGenerateAndStoreOtp() {
        String otp = otpService.generateAndStoreOtp(email);
        assertNotNull(otp);
        assertEquals(6, otp.length());
        // Verify it is numeric
        assertTrue(otp.matches("\\d{6}"));
    }

    @Test
    public void testResendCooldown() {
        otpService.generateAndStoreOtp(email);
        // Resending immediately should trigger cooldown active exception
        assertThrows(IllegalStateException.class, () -> {
            otpService.generateAndStoreOtp(email);
        });
    }

    @Test
    public void testVerifySuccess() {
        String otp = otpService.generateAndStoreOtp(email);
        OtpService.VerificationResult result = otpService.verifyOtp(email, otp);
        assertTrue(result.isVerified());
        assertNull(result.getReason());

        // Verify OTP was consumed
        OtpService.VerificationResult checkConsumed = otpService.verifyOtp(email, otp);
        assertFalse(checkConsumed.isVerified());
        assertEquals("INVALID_OTP", checkConsumed.getReason());
    }

    @Test
    public void testVerifyWrongOtp() {
        otpService.generateAndStoreOtp(email);
        OtpService.VerificationResult result = otpService.verifyOtp(email, "000000");
        assertFalse(result.isVerified());
        assertEquals("INVALID_OTP", result.getReason());
    }

    @Test
    public void testOtpExpired() {
        String otp = "123456";
        // Create an OtpRecord that is 6 minutes old
        LocalDateTime sixMinutesAgo = LocalDateTime.now().minusMinutes(6);
        OtpService.OtpRecord expiredRecord = new OtpService.OtpRecord(otp, sixMinutesAgo, sixMinutesAgo, 0);
        otpService.setOtpForTesting(email, expiredRecord);

        OtpService.VerificationResult result = otpService.verifyOtp(email, otp);
        assertFalse(result.isVerified());
        assertEquals("OTP_EXPIRED", result.getReason());
    }

    @Test
    public void testTooManyAttempts() {
        String otp = "123456";
        otpService.generateAndStoreOtp(email);

        // Attempt 1: wrong OTP -> INVALID_OTP
        OtpService.VerificationResult r1 = otpService.verifyOtp(email, "wrong1");
        assertFalse(r1.isVerified());
        assertEquals("INVALID_OTP", r1.getReason());

        // Attempt 2: wrong OTP -> INVALID_OTP
        OtpService.VerificationResult r2 = otpService.verifyOtp(email, "wrong2");
        assertFalse(r2.isVerified());
        assertEquals("INVALID_OTP", r2.getReason());

        // Attempt 3: wrong OTP -> TOO_MANY_ATTEMPTS
        OtpService.VerificationResult r3 = otpService.verifyOtp(email, "wrong3");
        assertFalse(r3.isVerified());
        assertEquals("TOO_MANY_ATTEMPTS", r3.getReason());

        // Subsequent check: OTP record deleted
        OtpService.VerificationResult r4 = otpService.verifyOtp(email, otp);
        assertFalse(r4.isVerified());
        assertEquals("INVALID_OTP", r4.getReason());
    }
}
