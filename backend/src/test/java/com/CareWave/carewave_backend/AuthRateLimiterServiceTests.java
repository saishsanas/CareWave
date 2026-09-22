package com.CareWave.carewave_backend;

import com.CareWave.carewave_backend.exception.RateLimitExceededException;
import com.CareWave.carewave_backend.service.AuthRateLimiterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.*;

public class AuthRateLimiterServiceTests {

    private AuthRateLimiterService rateLimiterService;

    @BeforeEach
    public void setUp() {
        rateLimiterService = new AuthRateLimiterService();
    }

    @Test
    public void testRateLimitAllowedWithinLimit() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.100");

        // Allowed 3 requests in window
        for (int i = 0; i < 3; i++) {
            assertDoesNotThrow(() -> rateLimiterService.checkRateLimit(request));
        }
    }

    @Test
    public void testRateLimitExceededThrowsException() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.101");

        // Allow max 2 requests for testing
        for (int i = 0; i < 10; i++) {
            rateLimiterService.checkRateLimit(request);
        }

        // 11th request should throw RateLimitExceededException
        assertThrows(RateLimitExceededException.class, () -> {
            rateLimiterService.checkRateLimit(request);
        });
    }

    @Test
    public void testClientIpExtractionFromHeader() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "203.0.113.195, 70.41.3.18");

        for (int i = 0; i < 10; i++) {
            rateLimiterService.checkRateLimit(request);
        }

        assertThrows(RateLimitExceededException.class, () -> {
            rateLimiterService.checkRateLimit(request);
        });
    }
}
