package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.dto.AlertResponse;
import com.CareWave.carewave_backend.entity.BreachEvent;
import com.CareWave.carewave_backend.entity.EmergencyEvent;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.enums.EmergencyStatus;
import com.CareWave.carewave_backend.enums.EmergencyType;
import com.CareWave.carewave_backend.repository.BreachEventRepository;
import com.CareWave.carewave_backend.repository.EmergencyRepository;
import com.CareWave.carewave_backend.repository.UserRepository;
import com.CareWave.carewave_backend.security.SecurityUtils;
import com.CareWave.carewave_backend.repository.LiveTrackingSessionRepository;
import com.CareWave.carewave_backend.entity.LiveTrackingSession;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AlertService {

    private final EmergencyRepository emergencyRepository;
    private final BreachEventRepository breachEventRepository;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;
    private final LiveTrackingSessionRepository trackingSessionRepository;

    public AlertService(
            EmergencyRepository emergencyRepository,
            BreachEventRepository breachEventRepository,
            UserRepository userRepository,
            SecurityUtils securityUtils,
            LiveTrackingSessionRepository trackingSessionRepository
    ) {
        this.emergencyRepository = emergencyRepository;
        this.breachEventRepository = breachEventRepository;
        this.userRepository = userRepository;
        this.securityUtils = securityUtils;
        this.trackingSessionRepository = trackingSessionRepository;
    }

    @Transactional(readOnly = true)
    public List<AlertResponse> getAlertsHistory() {
        User currentUser = securityUtils.getCurrentUser();
        UUID userId = currentUser.getUserId();

        List<EmergencyEvent> emergencies = emergencyRepository.findMyAndParticipatingEmergencies(userId);
        List<BreachEvent> breaches = breachEventRepository.findMyAndParticipatingBreaches(userId);

        List<AlertResponse> alerts = new ArrayList<>();

        // Map Emergencies
        for (EmergencyEvent e : emergencies) {
            AlertResponse response = new AlertResponse();
            response.setAlertId(e.getEmergencyId().toString());

            // Map Alert Type
            String alertType = "GENERAL_ALERT";
            if (e.getEmergencyType() == EmergencyType.MEDICAL) {
                alertType = "MEDICAL_SOS";
            } else if (e.getEmergencyType() == EmergencyType.POLICE) {
                alertType = "POLICE_SOS";
            } else if (e.getEmergencyType() == EmergencyType.FIRE) {
                alertType = "FIRE_SOS";
            }

            response.setAlertType(alertType);
            response.setStatus(e.getEmergencyStatus().toString());

            // Relationship
            boolean isCreator = e.getUserId().equals(userId);
            response.setRelationship(isCreator ? "CREATED_BY_ME" : "MONITORING");

            // Source User Info
            User alertSource = userRepository.findById(e.getUserId()).orElse(null);
            String sourceName = alertSource != null ? 
                (alertSource.getFirstName() + " " + (alertSource.getLastName() != null ? alertSource.getLastName() : "")).trim() 
                : "Unknown User";

            response.setAlertSourceUserId(e.getUserId().toString());
            response.setAlertSourceUserName(sourceName);
            response.setOwnerName(isCreator ? "Created By You" : sourceName);

            response.setCreatedAt(e.getCreatedAt());
            response.setLatitude(e.getLatitude());
            response.setLongitude(e.getLongitude());

            // Emergency tracking is enabled if active
            if (e.getEmergencyStatus() == EmergencyStatus.ACTIVE) {
                response.setTrackingSessionId(e.getEmergencyId().toString());
            } else {
                response.setTrackingSessionId(null);
            }

            alerts.add(response);
        }

        // Map Breaches
        for (BreachEvent b : breaches) {
            AlertResponse response = new AlertResponse();
            response.setAlertId(b.getBreachEventId().toString());

            // Map Alert Type
            String alertType = "GENERAL_ALERT";
            if ("ZONE_EXIT".equals(b.getEventType())) {
                alertType = "GEOFENCE_BREACH";
            } else if ("OFFLINE".equals(b.getEventType())) {
                alertType = "OFFLINE";
            } else if ("GPS_DISABLED".equals(b.getEventType())) {
                alertType = "GPS_DISABLED";
            }

            response.setAlertType(alertType);
            response.setStatus(b.getAlertStatus().toString());

            // Relationship: Owned if I am the guardian of the safe zone or the protected user
            boolean isZoneGuardian = b.getSafeZone() != null && b.getSafeZone().getGuardianUser().getUserId().equals(userId);
            boolean isSubject = b.getProtectedUser().getUserId().equals(userId);
            boolean isCreator = isZoneGuardian || isSubject;

            response.setRelationship(isCreator ? "CREATED_BY_ME" : "MONITORING");

            // Source User Info
            User protectedUser = b.getProtectedUser();
            String sourceName = protectedUser != null ? 
                (protectedUser.getFirstName() + " " + (protectedUser.getLastName() != null ? protectedUser.getLastName() : "")).trim() 
                : "Unknown User";

            response.setAlertSourceUserId(protectedUser != null ? protectedUser.getUserId().toString() : null);
            response.setAlertSourceUserName(sourceName);
            response.setOwnerName(isCreator ? "Created By You" : sourceName);

            response.setCreatedAt(b.getOccurredAt());
            if (protectedUser != null) {
                response.setLatitude(protectedUser.getCurrentLatitude());
                response.setLongitude(protectedUser.getCurrentLongitude());
            }

            // Geofence breaches: return the real tracking session ID if active
            if (b.getAlertStatus() == com.CareWave.carewave_backend.enums.AlertStatus.ACTIVE && protectedUser != null) {
                java.util.Optional<LiveTrackingSession> activeSession =
                        trackingSessionRepository.findByProtectedUserAndGuardianUserAndActiveTrue(protectedUser, currentUser);
                if (activeSession.isPresent()) {
                    response.setTrackingSessionId(activeSession.get().getSessionId().toString());
                } else {
                    response.setTrackingSessionId(null);
                }
            } else {
                response.setTrackingSessionId(null);
            }

            alerts.add(response);
        }

        // Sort: Newest first (createdAt DESC)
        return alerts.stream()
                .sorted((a1, a2) -> a2.getCreatedAt().compareTo(a1.getCreatedAt()))
                .collect(Collectors.toList());
    }
}
