package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.exception.RateLimitExceededException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthRateLimiterService {

    @Value("${auth.rate-limit.enabled:true}")
    private boolean enabled = true;

    @Value("${auth.rate-limit.max-requests:10}")
    private int maxRequests = 10;

    @Value("${auth.rate-limit.window-seconds:60}")
    private int windowSeconds = 60;

    @Value("${auth.rate-limit.trust-proxy:false}")
    private boolean trustProxy = false;

    private final ConcurrentHashMap<String, Deque<Long>> ipRequestTimestamps = new ConcurrentHashMap<>();

    public void checkRateLimit(HttpServletRequest request) {
        if (!enabled) {
            return;
        }

        String clientIp = extractClientIp(request);
        long now = Instant.now().getEpochSecond();
        long windowStart = now - windowSeconds;

        Deque<Long> timestamps = ipRequestTimestamps.computeIfAbsent(clientIp, k -> new ArrayDeque<>());

        synchronized (timestamps) {
            // Remove timestamps outside the sliding window
            while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
                timestamps.pollFirst();
            }

            if (timestamps.size() >= maxRequests) {
                throw new RateLimitExceededException("Too many authentication requests. Please wait and try again.");
            }

            timestamps.addLast(now);
        }
    }

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }
        if (trustProxy) {
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isBlank() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
                return xForwardedFor.split(",")[0].trim();
            }
        }
        String remoteAddr = request.getRemoteAddr();
        return remoteAddr != null ? remoteAddr : "unknown";
    }

    // Package-private setter for unit testing
    void setConfigForTesting(boolean enabled, int maxRequests, int windowSeconds) {
        this.enabled = enabled;
        this.maxRequests = maxRequests;
        this.windowSeconds = windowSeconds;
        this.trustProxy = false;
    }

    void setConfigForTesting(boolean enabled, int maxRequests, int windowSeconds, boolean trustProxy) {
        this.enabled = enabled;
        this.maxRequests = maxRequests;
        this.windowSeconds = windowSeconds;
        this.trustProxy = trustProxy;
    }
}
