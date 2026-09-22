package com.CareWave.carewave_backend.service;

import lombok.Getter;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {

    private static final Logger log = LoggerFactory.getLogger(OtpService.class);
    private static final String REDIS_OTP_KEY_PREFIX = "carewave:otp:";
    private static final String REDIS_COOLDOWN_KEY_PREFIX = "carewave:otp:cooldown:";
    private static final String REDIS_ATTEMPTS_KEY_PREFIX = "carewave:otp:attempts:";

    private final StringRedisTemplate redisTemplate;
    private final ConcurrentHashMap<String, OtpRecord> inMemoryCache = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public OtpService() {
        this.redisTemplate = null;
    }

    @Autowired
    public OtpService(@Autowired(required = false) StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Getter
    @Setter
    public static class OtpRecord {
        private String otp;
        private LocalDateTime createdAt;
        private LocalDateTime lastSentAt;
        private int attempts;

        public OtpRecord(String otp, LocalDateTime createdAt, LocalDateTime lastSentAt, int attempts) {
            this.otp = otp;
            this.createdAt = createdAt;
            this.lastSentAt = lastSentAt;
            this.attempts = attempts;
        }
    }

    public String generateAndStoreOtp(String email) {
        if (redisTemplate != null) {
            return generateAndStoreOtpRedis(email);
        }
        return generateAndStoreOtpInMemory(email);
    }

    private String generateAndStoreOtpRedis(String email) {
        try {
            String cooldownKey = REDIS_COOLDOWN_KEY_PREFIX + email;
            String otpKey = REDIS_OTP_KEY_PREFIX + email;
            String attemptsKey = REDIS_ATTEMPTS_KEY_PREFIX + email;

            if (Boolean.TRUE.equals(redisTemplate.hasKey(cooldownKey))) {
                log.info("[OTP] Cooldown Active for email");
                throw new IllegalStateException("COOLDOWN_ACTIVE");
            }

            String otp = String.format("%06d", random.nextInt(1000000));
            log.info("[OTP] Generated and storing in Redis");

            redisTemplate.opsForValue().set(otpKey, otp, Duration.ofMinutes(5));
            redisTemplate.opsForValue().set(cooldownKey, "1", Duration.ofSeconds(30));
            redisTemplate.opsForValue().set(attemptsKey, "0", Duration.ofMinutes(5));

            log.info("[OTP] Redis keys set successfully");
            return otp;
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.error("[OTP] Redis operation failed during OTP generation", e);
            throw new RuntimeException("OTP service temporarily unavailable. Please try again later.");
        }
    }

    private String generateAndStoreOtpInMemory(String email) {
        LocalDateTime now = LocalDateTime.now();
        OtpRecord existingRecord = inMemoryCache.get(email);

        if (existingRecord != null) {
            long secondsSinceLastSent = ChronoUnit.SECONDS.between(existingRecord.getLastSentAt(), now);
            if (secondsSinceLastSent < 30) {
                log.info("[OTP] Cooldown Active");
                throw new IllegalStateException("COOLDOWN_ACTIVE");
            }
        }

        String otp = String.format("%06d", random.nextInt(1000000));
        log.info("[OTP] Generated");

        OtpRecord newRecord = new OtpRecord(otp, now, now, 0);
        inMemoryCache.put(email, newRecord);
        log.info("[OTP] Sent");

        return otp;
    }

    public VerificationResult verifyOtp(String email, String code) {
        if (redisTemplate != null) {
            return verifyOtpRedis(email, code);
        }
        return verifyOtpInMemory(email, code);
    }

    private VerificationResult verifyOtpRedis(String email, String code) {
        try {
            String otpKey = REDIS_OTP_KEY_PREFIX + email;
            String attemptsKey = REDIS_ATTEMPTS_KEY_PREFIX + email;
            String cooldownKey = REDIS_COOLDOWN_KEY_PREFIX + email;

            String storedOtp = redisTemplate.opsForValue().get(otpKey);
            if (storedOtp == null) {
                log.info("[OTP] Verification Failed - Key missing or expired in Redis");
                return VerificationResult.invalid();
            }

            String attemptsStr = redisTemplate.opsForValue().get(attemptsKey);
            int attempts = attemptsStr != null ? Integer.parseInt(attemptsStr) : 0;
            if (attempts >= 3) {
                log.info("[OTP] Too Many Attempts");
                redisTemplate.delete(otpKey);
                redisTemplate.delete(attemptsKey);
                return VerificationResult.tooManyAttempts();
            }

            if (!storedOtp.equals(code)) {
                Long newAttempts = redisTemplate.opsForValue().increment(attemptsKey);
                log.info("[OTP] Verification Failed");
                if (newAttempts != null && newAttempts >= 3) {
                    log.info("[OTP] Too Many Attempts reached");
                    redisTemplate.delete(otpKey);
                    redisTemplate.delete(attemptsKey);
                    return VerificationResult.tooManyAttempts();
                }
                return VerificationResult.invalid();
            }

            log.info("[OTP] Verification Success in Redis");
            redisTemplate.delete(otpKey);
            redisTemplate.delete(attemptsKey);
            redisTemplate.delete(cooldownKey);
            return VerificationResult.success();
        } catch (Exception e) {
            log.error("[OTP] Redis operation failed during OTP verification", e);
            throw new RuntimeException("OTP verification temporarily unavailable. Please try again later.");
        }
    }

    private VerificationResult verifyOtpInMemory(String email, String code) {
        OtpRecord record = inMemoryCache.get(email);

        if (record == null) {
            log.info("[OTP] Verification Failed");
            return VerificationResult.invalid();
        }

        LocalDateTime now = LocalDateTime.now();

        if (record.getAttempts() >= 3) {
            log.info("[OTP] Too Many Attempts");
            inMemoryCache.remove(email);
            return VerificationResult.tooManyAttempts();
        }

        long minutesSinceCreated = ChronoUnit.MINUTES.between(record.getCreatedAt(), now);
        if (minutesSinceCreated >= 5) {
            log.info("[OTP] Expired");
            inMemoryCache.remove(email);
            return VerificationResult.expired();
        }

        if (!record.getOtp().equals(code)) {
            record.setAttempts(record.getAttempts() + 1);
            log.info("[OTP] Verification Failed");

            if (record.getAttempts() >= 3) {
                log.info("[OTP] Too Many Attempts");
                inMemoryCache.remove(email);
                return VerificationResult.tooManyAttempts();
            }
            return VerificationResult.invalid();
        }

        log.info("[OTP] Verification Success");
        inMemoryCache.remove(email);
        return VerificationResult.success();
    }

    public void setOtpForTesting(String email, OtpRecord record) {
        inMemoryCache.put(email, record);
    }

    public void clearOtpForTesting(String email) {
        inMemoryCache.remove(email);
        if (redisTemplate != null) {
            try {
                redisTemplate.delete(REDIS_OTP_KEY_PREFIX + email);
                redisTemplate.delete(REDIS_ATTEMPTS_KEY_PREFIX + email);
                redisTemplate.delete(REDIS_COOLDOWN_KEY_PREFIX + email);
            } catch (Exception ignored) {
            }
        }
    }

    @Getter
    public static class VerificationResult {
        private final boolean verified;
        private final String reason;

        private VerificationResult(boolean verified, String reason) {
            this.verified = verified;
            this.reason = reason;
        }

        public static VerificationResult success() {
            return new VerificationResult(true, null);
        }

        public static VerificationResult invalid() {
            return new VerificationResult(false, "INVALID_OTP");
        }

        public static VerificationResult expired() {
            return new VerificationResult(false, "OTP_EXPIRED");
        }

        public static VerificationResult tooManyAttempts() {
            return new VerificationResult(false, "TOO_MANY_ATTEMPTS");
        }
    }
}
