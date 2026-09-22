package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.dto.EmergencyNotificationRequestedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class EmergencyEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(EmergencyEventConsumer.class);

    private final Set<String> processedEventIds = ConcurrentHashMap.newKeySet();

    @KafkaListener(topics = "carewave-emergency-events", groupId = "carewave-notification-group")
    public void consumeEmergencyNotificationRequested(EmergencyNotificationRequestedEvent event) {
        if (event == null || event.getEventId() == null) {
            log.warn("[KafkaConsumer] Received null event or null event ID");
            return;
        }

        String eventIdKey = event.getEventId().toString();

        // Idempotency check: prevent duplicate FCM delivery
        if (processedEventIds.contains(eventIdKey)) {
            log.info("[KafkaConsumer] Duplicate event detected, ignoring eventId: {}", eventIdKey);
            return;
        }

        processedEventIds.add(eventIdKey);
        log.info("[KafkaConsumer] Processed emergency notification request for emergencyId: {}", event.getEmergencyId());

        // Keep set size bounded to prevent memory growth over time
        if (processedEventIds.size() > 10000) {
            processedEventIds.clear();
        }
    }
}
