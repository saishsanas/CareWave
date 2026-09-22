package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.dto.EmergencyRequest;
import com.CareWave.carewave_backend.entity.EmergencyContact;
import com.CareWave.carewave_backend.entity.EmergencyEvent;
import com.CareWave.carewave_backend.entity.LiveTrackingSession;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.enums.EmergencyStatus;
import com.CareWave.carewave_backend.enums.EmergencyType;
import com.CareWave.carewave_backend.repository.EmergencyRepository;
import com.CareWave.carewave_backend.repository.UserRepository;
import com.CareWave.carewave_backend.repository.LiveTrackingSessionRepository;
import com.CareWave.carewave_backend.repository.EmergencyContactRepository;
import com.CareWave.carewave_backend.security.SecurityUtils;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class EmergencyService {

    private final EmergencyRepository emergencyRepository;
    private final MedicalEmergencyService medicalEmergencyService;
    private final PoliceEmergencyService policeEmergencyService;
    private final FireEmergencyService fireEmergencyService;
    private final UserRepository userRepository;
    private final LiveTrackingSessionRepository trackingSessionRepository;
    private final EmergencyUtils emergencyUtils;
    private final NotificationService notificationService;
    private final EmergencyContactRepository emergencyContactRepository;
    private final SecurityUtils securityUtils;
    private final EmergencyEventProducer emergencyEventProducer;

    public EmergencyService(
            EmergencyRepository emergencyRepository,
            MedicalEmergencyService medicalEmergencyService,
            PoliceEmergencyService policeEmergencyService,
            FireEmergencyService fireEmergencyService,
            UserRepository userRepository,
            LiveTrackingSessionRepository trackingSessionRepository,
            EmergencyUtils emergencyUtils,
            NotificationService notificationService,
            EmergencyContactRepository emergencyContactRepository,
            SecurityUtils securityUtils,
            EmergencyEventProducer emergencyEventProducer
    ) {
        this.emergencyRepository = emergencyRepository;
        this.medicalEmergencyService = medicalEmergencyService;
        this.policeEmergencyService = policeEmergencyService;
        this.fireEmergencyService = fireEmergencyService;
        this.userRepository = userRepository;
        this.trackingSessionRepository = trackingSessionRepository;
        this.emergencyUtils = emergencyUtils;
        this.notificationService = notificationService;
        this.emergencyContactRepository = emergencyContactRepository;
        this.securityUtils = securityUtils;
        this.emergencyEventProducer = emergencyEventProducer;
    }

    public EmergencyEvent createEmergencyEvent(EmergencyRequest request) {
        User currentUser = securityUtils.getCurrentUser();
        java.util.UUID userId = (currentUser != null) ? currentUser.getUserId() : request.getUserId();

        List<EmergencyEvent> activeList = emergencyRepository
                .findByUserIdAndEmergencyStatus(userId, EmergencyStatus.ACTIVE);
        if (!activeList.isEmpty()) {
            throw new com.CareWave.carewave_backend.exception.ActiveEmergencyExistsException("User already has an active emergency");
        }

        EmergencyEvent event = new EmergencyEvent();
        event.setEmergencyStatus(EmergencyStatus.ACTIVE);
        event.setUserId(userId);

        if (request.getEmergencyType() == null) {
            event.setEmergencyType(EmergencyType.OTHER);
        } else {
            event.setEmergencyType(request.getEmergencyType());
        }

        if (isValidLocation(request.getLatitude(), request.getLongitude())) {
            event.setLongitude(request.getLongitude());
            event.setLatitude(request.getLatitude());
        }

        event.setFireSeverity(
                request.getFireSeverity()
        );

        event.setEvacuationMessage(
                request.getEvacuationMessage()
        );

        event.setEmergencyRadiusKm(
                request.getEmergencyRadiusKm()
        );

        EmergencyEvent savedEvent =
                emergencyRepository.save(event);

        // Publish EmergencyNotificationRequestedEvent to Kafka
        com.CareWave.carewave_backend.dto.EmergencyNotificationRequestedEvent kafkaEvent =
                new com.CareWave.carewave_backend.dto.EmergencyNotificationRequestedEvent(
                        java.util.UUID.randomUUID(),
                        savedEvent.getEmergencyId(),
                        savedEvent.getUserId(),
                        savedEvent.getEmergencyType().name(),
                        savedEvent.getLatitude(),
                        savedEvent.getLongitude(),
                        LocalDateTime.now().toString()
                );
        emergencyEventProducer.publishEmergencyEvent(kafkaEvent);

        // Create LiveTrackingSession records for MEDICAL, POLICE, and FIRE emergency contacts (guardians)
        if (savedEvent.getEmergencyType() == EmergencyType.MEDICAL ||
            savedEvent.getEmergencyType() == EmergencyType.POLICE ||
            savedEvent.getEmergencyType() == EmergencyType.FIRE) {

            User protectedUser = userRepository.findById(savedEvent.getUserId())
                    .orElseThrow(() -> new com.CareWave.carewave_backend.exception.UserNotFoundException("User Not Found"));

            LocalDateTime now = LocalDateTime.now();

            // Ensure live tracking is enabled on the protected user for 30 minutes
            protectedUser.setLiveTrackingEnabledUntil(now.plusMinutes(30));
            userRepository.save(protectedUser);

            List<EmergencyContact> contacts = emergencyUtils.getEmergencyContacts(protectedUser);
            for (EmergencyContact contact : contacts) {
                User guardian = contact.getLinkedUser();
                if (guardian != null) {
                    boolean sessionExists = trackingSessionRepository
                            .findByProtectedUserAndGuardianUserAndActiveTrue(protectedUser, guardian)
                            .isPresent();

                    if (!sessionExists) {
                        LiveTrackingSession session = new LiveTrackingSession();
                        session.setGuardianUser(guardian);
                        session.setProtectedUser(protectedUser);
                        session.setTriggeredByEventType(savedEvent.getEmergencyType().name());
                        session.setStartedAt(now);
                        session.setExpiresAt(now.plusMinutes(30));
                        session.setActive(true);
                        session.setAutoExpired(false);
                        trackingSessionRepository.save(session);
                    }
                }
            }
        }

        if (savedEvent.getEmergencyType()
                == EmergencyType.MEDICAL) {

            medicalEmergencyService
                    .handleMedicalEmergency(savedEvent);

        } else if (savedEvent.getEmergencyType()
                == EmergencyType.POLICE) {

            policeEmergencyService
                    .handlePoliceEmergency(savedEvent);

        } else if (savedEvent.getEmergencyType()
                == EmergencyType.FIRE) {

            fireEmergencyService
                    .handleFireEmergency(savedEvent);

        } else if (savedEvent.getEmergencyType()
                == EmergencyType.PERSONAL_SAFETY || savedEvent.getEmergencyType()
                == EmergencyType.OTHER) {

            handleWomenSafetyEmergency(savedEvent);
        }
        return savedEvent;
    }

    private void handleWomenSafetyEmergency(EmergencyEvent event) {
        User user = userRepository.findById(event.getUserId())
                .orElseThrow(() -> new com.CareWave.carewave_backend.exception.UserNotFoundException("User Not Found"));

        LocalDateTime now = LocalDateTime.now();

        // 1. Activate live tracking on user
        user.setLiveTrackingEnabledUntil(now.plusMinutes(30));
        userRepository.save(user);

        // 2. Send FCM to the user
        notificationService.sendWomenSafetyAlertToUser(user, event);

        // 3. Create active tracking sessions and send notifications to emergency contacts (guardians)
        List<EmergencyContact> contacts = emergencyUtils.getEmergencyContacts(user);
        for (EmergencyContact contact : contacts) {
            User guardian = contact.getLinkedUser();
            if (guardian != null) {
                boolean sessionExists = trackingSessionRepository
                        .findByProtectedUserAndGuardianUserAndActiveTrue(user, guardian)
                        .isPresent();

                if (!sessionExists) {
                    LiveTrackingSession session = new LiveTrackingSession();
                    session.setGuardianUser(guardian);
                    session.setProtectedUser(user);
                    session.setTriggeredByEventType("PERSONAL_SAFETY");
                    session.setStartedAt(now);
                    session.setExpiresAt(now.plusMinutes(30));
                    session.setActive(true);
                    session.setAutoExpired(false);
                    trackingSessionRepository.save(session);
                }

                // Send FCM to guardian
                notificationService.sendWomenSafetyAlertToContact(guardian, user, event);
            }
        }
    }

    private boolean isValidLocation(Double latitude, Double longitude) {
        return latitude != null && longitude != null
                && latitude >= -90 && latitude <= 90
                && longitude >= -180 && longitude <= 180;
    }

    public java.util.Optional<EmergencyEvent> getActiveEmergency(java.util.UUID userId) {
        // Priority 1: Own active emergency
        List<EmergencyEvent> activeList = emergencyRepository.findByUserIdAndEmergencyStatus(userId, com.CareWave.carewave_backend.enums.EmergencyStatus.ACTIVE);
        if (!activeList.isEmpty()) {
            return java.util.Optional.of(activeList.get(0));
        }

        // Priority 2: Participating active emergency (where caller is a registered contact)
        List<EmergencyEvent> participatingList = emergencyRepository.findActiveParticipatingEmergencies(userId, com.CareWave.carewave_backend.enums.EmergencyStatus.ACTIVE);
        return participatingList.isEmpty() ? java.util.Optional.empty() : java.util.Optional.of(participatingList.get(0));
    }

    @org.springframework.transaction.annotation.Transactional
    public EmergencyEvent cancelEmergency(java.util.UUID emergencyId) {
        User currentUser = securityUtils.getCurrentUser();
        EmergencyEvent event = emergencyRepository.findById(emergencyId)
                .orElseThrow(() -> new com.CareWave.carewave_backend.exception.EmergencyNotFoundException("Emergency not found"));

        if (!currentUser.getUserId().equals(event.getUserId())) {
            User owner = userRepository.findById(event.getUserId()).orElse(null);
            boolean isContact = owner != null && emergencyContactRepository.existsByOwnerUserAndLinkedUser(owner, currentUser);
            if (!isContact) {
                throw new com.CareWave.carewave_backend.exception.UnauthorizedAccessException("You are not authorized to cancel this emergency");
            }
        }

        if (event.getEmergencyStatus() == EmergencyStatus.ACTIVE) {
            event.setEmergencyStatus(EmergencyStatus.CANCELLED);
            event.setResolvedAt(LocalDateTime.now());
            event = emergencyRepository.save(event);

            User owner = userRepository.findById(event.getUserId()).orElse(null);
            if (owner != null) {
                owner.setLiveTrackingEnabledUntil(null);
                userRepository.save(owner);

                List<LiveTrackingSession> activeSessions =
                        trackingSessionRepository.findAllByProtectedUserAndActiveTrue(owner);

                for (LiveTrackingSession session : activeSessions) {
                    session.setActive(false);
                    session.setResolvedAt(LocalDateTime.now());
                    trackingSessionRepository.save(session);
                }
            }
        }
        return event;
    }

    @org.springframework.transaction.annotation.Transactional
    public EmergencyEvent resolveEmergency(java.util.UUID emergencyId) {
        User currentUser = securityUtils.getCurrentUser();
        EmergencyEvent event = emergencyRepository.findById(emergencyId)
                .orElseThrow(() -> new com.CareWave.carewave_backend.exception.EmergencyNotFoundException("Emergency not found"));

        if (!currentUser.getUserId().equals(event.getUserId())) {
            User owner = userRepository.findById(event.getUserId()).orElse(null);
            boolean isContact = owner != null && emergencyContactRepository.existsByOwnerUserAndLinkedUser(owner, currentUser);
            if (!isContact) {
                throw new com.CareWave.carewave_backend.exception.UnauthorizedAccessException("You are not authorized to resolve this emergency");
            }
        }

        if (event.getEmergencyStatus() == EmergencyStatus.ACTIVE) {
            event.setEmergencyStatus(EmergencyStatus.RESOLVED);
            event.setResolvedAt(LocalDateTime.now());
            event = emergencyRepository.save(event);

            User owner = userRepository.findById(event.getUserId()).orElse(null);
            if (owner != null) {
                owner.setLiveTrackingEnabledUntil(null);
                userRepository.save(owner);

                List<LiveTrackingSession> activeSessions =
                        trackingSessionRepository.findAllByProtectedUserAndActiveTrue(owner);

                for (LiveTrackingSession session : activeSessions) {
                    session.setActive(false);
                    session.setResolvedAt(LocalDateTime.now());
                    trackingSessionRepository.save(session);
                }
            }
        }
        return event;
    }

    public void sendAcknowledgementNotification(java.util.UUID emergencyId) {
        EmergencyEvent event = emergencyRepository.findById(emergencyId)
                .orElseThrow(() -> new com.CareWave.carewave_backend.exception.EmergencyNotFoundException("Emergency not found"));

        User victim = userRepository.findById(event.getUserId()).orElse(null);
        User guardian = securityUtils.getCurrentUser();

        if (victim == null || guardian == null) {
            throw new IllegalArgumentException("User not found");
        }

        // Verify the guardian is registered as an EmergencyContact for the victim
        boolean isContact = emergencyContactRepository.existsByOwnerUserAndLinkedUser(victim, guardian);
        if (!isContact) {
            throw new com.CareWave.carewave_backend.exception.UnauthorizedAccessException("You are not authorized to acknowledge this emergency");
        }

        notificationService.sendAcknowledgementNotification(victim, guardian);
    }
}
