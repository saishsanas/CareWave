package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.dto.EmergencyNotificationRequestedEvent;
import com.CareWave.carewave_backend.entity.EmergencyContact;
import com.CareWave.carewave_backend.entity.EmergencyEvent;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.repository.EmergencyRepository;
import com.CareWave.carewave_backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class EmergencyEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(EmergencyEventConsumer.class);

    private final Set<String> processedEventIds = ConcurrentHashMap.newKeySet();
    private final EmergencyRepository emergencyRepository;
    private final UserRepository userRepository;
    private final EmergencyUtils emergencyUtils;
    private final NotificationService notificationService;

    public EmergencyEventConsumer(
            EmergencyRepository emergencyRepository,
            UserRepository userRepository,
            EmergencyUtils emergencyUtils,
            NotificationService notificationService
    ) {
        this.emergencyRepository = emergencyRepository;
        this.userRepository = userRepository;
        this.emergencyUtils = emergencyUtils;
        this.notificationService = notificationService;
    }

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

        try {
            if (event.getEmergencyId() != null) {
                Optional<EmergencyEvent> emergencyOpt = emergencyRepository.findById(event.getEmergencyId());
                Optional<User> victimOpt = userRepository.findById(event.getUserId());

                if (emergencyOpt.isPresent() && victimOpt.isPresent()) {
                    EmergencyEvent emergency = emergencyOpt.get();
                    User victim = victimOpt.get();
                    List<EmergencyContact> contacts = emergencyUtils.getEmergencyContacts(victim);

                    for (EmergencyContact contact : contacts) {
                        User guardian = contact.getLinkedUser();
                        if (guardian != null) {
                            switch (emergency.getEmergencyType()) {
                                case MEDICAL:
                                    notificationService.sendEmergencyAlert(guardian, emergency);
                                    break;
                                case POLICE:
                                    notificationService.sendPoliceEmergencyAlert(guardian, emergency);
                                    break;
                                case FIRE:
                                    notificationService.sendFireEmergencyAlert(guardian, emergency);
                                    break;
                                case PERSONAL_SAFETY:
                                    notificationService.sendWomenSafetyAlertToContact(guardian, victim, emergency);
                                    break;
                                default:
                                    notificationService.sendEmergencyTrackingAlertToContact(guardian, victim, emergency.getEmergencyType().name());
                                    break;
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("[KafkaConsumer] Failed to send emergency notifications: {}", e.getMessage(), e);
        }

        // Keep set size bounded to prevent memory growth over time
        if (processedEventIds.size() > 10000) {
            processedEventIds.clear();
        }
    }
}
