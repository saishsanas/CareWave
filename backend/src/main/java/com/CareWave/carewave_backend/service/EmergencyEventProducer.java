package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.dto.EmergencyNotificationRequestedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class EmergencyEventProducer {

    private static final Logger log = LoggerFactory.getLogger(EmergencyEventProducer.class);
    private static final String TOPIC = "carewave-emergency-events";

    private final KafkaTemplate<String, EmergencyNotificationRequestedEvent> kafkaTemplate;

    @Autowired
    public EmergencyEventProducer(@Autowired(required = false) KafkaTemplate<String, EmergencyNotificationRequestedEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public boolean publishEmergencyEvent(EmergencyNotificationRequestedEvent event) {
        if (kafkaTemplate == null) {
            log.warn("[KafkaProducer] KafkaTemplate not initialized. Kafka publishing skipped for event: {}", event.getEventId());
            return false;
        }

        try {
            kafkaTemplate.send(TOPIC, event.getEmergencyId().toString(), event);
            log.info("[KafkaProducer] Successfully dispatched emergency event {} for emergency {}", event.getEventId(), event.getEmergencyId());
            return true;
        } catch (Exception e) {
            log.error("[KafkaProducer] Kafka broker unavailable or error sending event {}: {}. Fallback to direct handling.", event.getEventId(), e.getMessage());
            return false;
        }
    }
}
