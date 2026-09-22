package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.entity.BreachEvent;
import com.CareWave.carewave_backend.entity.LiveTrackingSession;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.enums.AlertStatus;
import com.CareWave.carewave_backend.repository.BreachEventRepository;
import com.CareWave.carewave_backend.repository.LiveTrackingSessionRepository;
import com.CareWave.carewave_backend.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class LocationMonitoringScheduler {

    private final UserRepository userRepository;
    private final BreachEventRepository breachEventRepository;
    private final LiveTrackingSessionRepository trackingSessionRepository;
    private final EmergencyUtils emergencyUtils;
    private final NotificationService notificationService;

    public LocationMonitoringScheduler(
            UserRepository userRepository,
            BreachEventRepository breachEventRepository,
            LiveTrackingSessionRepository trackingSessionRepository,
            EmergencyUtils emergencyUtils,
            NotificationService notificationService
    ) {
        this.userRepository = userRepository;
        this.breachEventRepository = breachEventRepository;
        this.trackingSessionRepository = trackingSessionRepository;
        this.emergencyUtils = emergencyUtils;
        this.notificationService = notificationService;
    }

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void monitorUserLocations() {
        LocalDateTime now = LocalDateTime.now();

        // 1. Detect Offline Users (>10 minutes since last location update)
        LocalDateTime offlineThreshold = now.minusMinutes(10);
        List<User> offlineUsers = userRepository.findUsersOffline(offlineThreshold);

        for (User user : offlineUsers) {
            boolean alreadyOffline = breachEventRepository
                    .findByProtectedUserAndAlertStatus(user, AlertStatus.ACTIVE)
                    .stream()
                    .anyMatch(e -> "OFFLINE".equals(e.getEventType()));

            if (!alreadyOffline) {
                // Trigger offline breach
                user.setLiveTrackingEnabledUntil(now.plusMinutes(30));
                userRepository.save(user);

                BreachEvent event = new BreachEvent();
                event.setProtectedUser(user);
                event.setEventType("OFFLINE");
                event.setAlertStatus(AlertStatus.ACTIVE);
                event.setOccurredAt(now);
                event.setUpdatedAt(now);
                breachEventRepository.save(event);

                // Create tracking sessions and alert contacts
                List<User> guardians = emergencyUtils.getEmergencyContacts(user).stream()
                        .map(c -> c.getLinkedUser())
                        .filter(u -> u != null)
                        .toList();

                for (User guardian : guardians) {
                    boolean sessionExists = trackingSessionRepository
                            .findByProtectedUserAndGuardianUserAndActiveTrue(user, guardian)
                            .isPresent();

                    if (!sessionExists) {
                        LiveTrackingSession session = new LiveTrackingSession();
                        session.setGuardianUser(guardian);
                        session.setProtectedUser(user);
                        session.setTriggeredByEventType("OFFLINE");
                        session.setStartedAt(now);
                        session.setExpiresAt(now.plusMinutes(30));
                        session.setActive(true);
                        session.setAutoExpired(false);
                        trackingSessionRepository.save(session);
                    }

                    notificationService.sendOfflineAlert(guardian, user);
                    notificationService.sendTrackingActivatedAlert(guardian, user, 30);
                }
            }
        }

        // 2. Auto-expire past tracking sessions
        List<LiveTrackingSession> expiredSessions = trackingSessionRepository.findExpiredActiveSessions(now);
        for (LiveTrackingSession session : expiredSessions) {
            session.setActive(false);
            session.setAutoExpired(true);
            trackingSessionRepository.save(session);

            notificationService.sendTrackingExpiredAlert(session.getGuardianUser(), session.getProtectedUser());
        }

        // 3. Mark unresolved active alerts older than 2 hours as STALE
        LocalDateTime staleThreshold = now.minusHours(2);
        List<BreachEvent> staleBreaches = breachEventRepository.findActiveBreachesOlderThan(staleThreshold);

        for (BreachEvent breach : staleBreaches) {
            breach.setAlertStatus(AlertStatus.STALE);
            breach.setUpdatedAt(now);
            breachEventRepository.save(breach);

            User protectedUser = breach.getProtectedUser();
            List<BreachEvent> otherActive = breachEventRepository.findByProtectedUserAndAlertStatus(protectedUser, AlertStatus.ACTIVE);

            if (otherActive.isEmpty()) {
                protectedUser.setCurrentlyOutsideSafeZone(false);
                protectedUser.setLiveTrackingEnabledUntil(null);
                userRepository.save(protectedUser);

                // Terminate all remaining active tracking sessions
                List<LiveTrackingSession> activeSessions = trackingSessionRepository.findAllByProtectedUserAndActiveTrue(protectedUser);

                for (LiveTrackingSession s : activeSessions) {
                    s.setActive(false);
                    s.setResolvedAt(now);
                    trackingSessionRepository.save(s);

                    notificationService.sendTrackingExpiredAlert(s.getGuardianUser(), protectedUser);
                }
            }
        }
    }
}
