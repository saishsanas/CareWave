package com.CareWave.carewave_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
public class RedisActiveTrackingService {

    private static final Logger log = LoggerFactory.getLogger(RedisActiveTrackingService.class);
    private static final String REDIS_ACTIVE_TRACKING_PREFIX = "carewave:active_location:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Autowired
    public RedisActiveTrackingService(@Autowired(required = false) StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = new ObjectMapper();
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class CachedActiveLocation {
        private String userId;
        private Double latitude;
        private Double longitude;
        private String lastLocationUpdatedAt;
        private Boolean gpsEnabled;

        public CachedActiveLocation(UUID userId, Double latitude, Double longitude, String lastLocationUpdatedAt, Boolean gpsEnabled) {
            this.userId = userId != null ? userId.toString() : null;
            this.latitude = latitude;
            this.longitude = longitude;
            this.lastLocationUpdatedAt = lastLocationUpdatedAt;
            this.gpsEnabled = gpsEnabled;
        }
    }

    public void cacheActiveLocation(UUID userId, Double latitude, Double longitude, String lastLocationUpdatedAt, Boolean gpsEnabled) {
        if (redisTemplate == null || userId == null) {
            return;
        }
        try {
            String key = REDIS_ACTIVE_TRACKING_PREFIX + userId;
            CachedActiveLocation data = new CachedActiveLocation(userId, latitude, longitude, lastLocationUpdatedAt, gpsEnabled);
            String json = objectMapper.writeValueAsString(data);
            redisTemplate.opsForValue().set(key, json, Duration.ofMinutes(30));
            log.debug("[RedisActiveTracking] Cached active location for user {}", userId);
        } catch (Exception e) {
            log.error("[RedisActiveTracking] Failed to cache active location for user {}: {}", userId, e.getMessage());
        }
    }

    public CachedActiveLocation getCachedActiveLocation(UUID userId) {
        if (redisTemplate == null || userId == null) {
            return null;
        }
        try {
            String key = REDIS_ACTIVE_TRACKING_PREFIX + userId;
            String json = redisTemplate.opsForValue().get(key);
            if (json != null && !json.isBlank()) {
                return objectMapper.readValue(json, CachedActiveLocation.class);
            }
        } catch (Exception e) {
            log.error("[RedisActiveTracking] Failed to read active location cache for user {}: {}", userId, e.getMessage());
        }
        return null;
    }

    public void evictActiveLocation(UUID userId) {
        if (redisTemplate == null || userId == null) {
            return;
        }
        try {
            String key = REDIS_ACTIVE_TRACKING_PREFIX + userId;
            redisTemplate.delete(key);
            log.debug("[RedisActiveTracking] Evicted active location cache for user {}", userId);
        } catch (Exception e) {
            log.error("[RedisActiveTracking] Failed to evict active location cache for user {}: {}", userId, e.getMessage());
        }
    }
}
