package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.dto.CancelAlertRequest;
import com.CareWave.carewave_backend.dto.CancelAlertResponse;
import com.CareWave.carewave_backend.dto.LiveLocationResponse;
import com.CareWave.carewave_backend.dto.TrackingStatusResponse;
import com.CareWave.carewave_backend.entity.BreachEvent;
import com.CareWave.carewave_backend.entity.LiveTrackingSession;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.enums.AlertStatus;
import com.CareWave.carewave_backend.exception.TrackingSessionExpiredException;
import com.CareWave.carewave_backend.exception.UnauthorizedAccessException;
import com.CareWave.carewave_backend.exception.UserNotFoundException;
import com.CareWave.carewave_backend.repository.BreachEventRepository;
import com.CareWave.carewave_backend.repository.EmergencyContactRepository;
import com.CareWave.carewave_backend.repository.LiveTrackingSessionRepository;
import com.CareWave.carewave_backend.repository.UserRepository;
import com.CareWave.carewave_backend.security.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class LiveTrackingService {

    private static final Logger log = LoggerFactory.getLogger(LiveTrackingService.class);

    private final UserRepository userRepository;
    private final BreachEventRepository breachEventRepository;
    private final LiveTrackingSessionRepository trackingSessionRepository;
    private final EmergencyContactRepository emergencyContactRepository;
    private final UserLocationService userLocationService;
    private final NotificationService notificationService;
    private final SecurityUtils securityUtils;
    private final RedisActiveTrackingService redisActiveTrackingService;

    public LiveTrackingService(
            UserRepository userRepository,
            BreachEventRepository breachEventRepository,
            LiveTrackingSessionRepository trackingSessionRepository,
            EmergencyContactRepository emergencyContactRepository,
            UserLocationService userLocationService,
            NotificationService notificationService,
            SecurityUtils securityUtils,
            RedisActiveTrackingService redisActiveTrackingService
    ) {
        this.userRepository = userRepository;
        this.breachEventRepository = breachEventRepository;
        this.trackingSessionRepository = trackingSessionRepository;
        this.emergencyContactRepository = emergencyContactRepository;
        this.userLocationService = userLocationService;
        this.notificationService = notificationService;
        this.securityUtils = securityUtils;
        this.redisActiveTrackingService = redisActiveTrackingService;
    }

    public TrackingStatusResponse getTrackingStatus(UUID protectedUserId) {
        return userLocationService.getProtectedUserLocationStatus(protectedUserId);
    }

    @Transactional
    public LiveLocationResponse getLiveLocation(UUID protectedUserId) {
        User guardian = securityUtils.getCurrentUser();
        User protectedUser = userRepository.findById(protectedUserId)
                .orElseThrow(() -> new UserNotFoundException("Protected user not found"));

        // Relationship Validation
        boolean isLinked = emergencyContactRepository.existsByOwnerUserAndLinkedUser(protectedUser, guardian);
        if (!isLinked) {
            throw new UnauthorizedAccessException("You are not authorized to view the location of this user");
        }

        LocalDateTime now = LocalDateTime.now();

        // 1. Check active tracking session and handle auto-expiration
        boolean isTrackingActive = false;
        Optional<LiveTrackingSession> sessionOpt = trackingSessionRepository
                .findByProtectedUserAndGuardianUserAndActiveTrue(protectedUser, guardian);

        if (sessionOpt.isPresent()) {
            LiveTrackingSession session = sessionOpt.get();
            if (session.getExpiresAt().isAfter(now)) {
                isTrackingActive = true;
            } else {
                session.setActive(false);
                session.setAutoExpired(true);
                trackingSessionRepository.save(session);
                redisActiveTrackingService.evictActiveLocation(protectedUserId);
                log.info("Deactivated expired tracking session: {}", session.getSessionId());
            }
        }

        // Final Authorization Rule: requires active tracking session
        if (!isTrackingActive) {
            throw new TrackingSessionExpiredException("No active live tracking session found for this user.");
        }

        // Live Tracking Access Audit if tracking session is active
        if (isTrackingActive && sessionOpt.isPresent()) {
            LiveTrackingSession session = sessionOpt.get();
            session.setLastAccessedAt(now);
            trackingSessionRepository.save(session);
            log.info("Audited live tracking access for guardian {} on user {}", guardian.getUserId(), protectedUser.getUserId());
        }

        // Read active location from Redis cache first, fall back to MySQL entity if missing or offline
        RedisActiveTrackingService.CachedActiveLocation cached = redisActiveTrackingService.getCachedActiveLocation(protectedUserId);

        LiveLocationResponse response = new LiveLocationResponse();
        if (cached != null && cached.getLatitude() != null && cached.getLongitude() != null) {
            response.setLatitude(cached.getLatitude());
            response.setLongitude(cached.getLongitude());
        } else {
            response.setLatitude(protectedUser.getCurrentLatitude());
            response.setLongitude(protectedUser.getCurrentLongitude());
        }

        return response;
    }

    @Transactional
    public CancelAlertResponse cancelAlert(CancelAlertRequest request) {
        User guardian = securityUtils.getCurrentUser();



        BreachEvent breachEvent = breachEventRepository.findById(request.getBreachEventId())
                .orElseThrow(() -> new IllegalArgumentException("Breach event not found"));

        User protectedUser = breachEvent.getProtectedUser();

        // Relationship Validation
        boolean isLinked = emergencyContactRepository.existsByOwnerUserAndLinkedUser(protectedUser, guardian);
        if (!isLinked) {
            throw new UnauthorizedAccessException("You are not authorized to cancel this alert");
        }

        LocalDateTime now = LocalDateTime.now();

        if (breachEvent.getAlertStatus() == AlertStatus.ACTIVE) {
            breachEvent.setAlertStatus(AlertStatus.CANCELLED);
            breachEvent.setCancelledAt(now);
            breachEvent.setResolvedOrCancelledBy(guardian.getFirstName() + " " + guardian.getLastName());
            breachEvent.setUpdatedAt(now);
            breachEventRepository.save(breachEvent);

            // Cancel active tracking session for this guardian and user
            Optional<LiveTrackingSession> sessionOpt = trackingSessionRepository
                    .findByProtectedUserAndGuardianUserAndActiveTrue(protectedUser, guardian);
            if (sessionOpt.isPresent()) {
                LiveTrackingSession session = sessionOpt.get();
                session.setActive(false);
                session.setCancelledAt(now);
                trackingSessionRepository.save(session);
            }

            // If there are no other active breaches, reset the user flags and all other active tracking sessions
            List<BreachEvent> otherActiveBreaches = breachEventRepository.findByProtectedUserAndAlertStatus(protectedUser, AlertStatus.ACTIVE);
            if (otherActiveBreaches.isEmpty()) {
                protectedUser.setCurrentlyOutsideSafeZone(false);
                protectedUser.setLiveTrackingEnabledUntil(null);
                userRepository.save(protectedUser);

                List<LiveTrackingSession> allActiveSessions = trackingSessionRepository.findAllByProtectedUserAndActiveTrue(protectedUser);
                for (LiveTrackingSession s : allActiveSessions) {
                    s.setActive(false);
                    s.setCancelledAt(now);
                    trackingSessionRepository.save(s);
                }
                redisActiveTrackingService.evictActiveLocation(protectedUser.getUserId());
            }

            notificationService.sendAlertCancelledNotification(guardian, protectedUser);
        }

        CancelAlertResponse response = new CancelAlertResponse();
        response.setBreachEventId(breachEvent.getBreachEventId());
        response.setAlertStatus(breachEvent.getAlertStatus().name());
        response.setProcessedAt(now);
        response.setMessage("Alert successfully cancelled.");
        return response;
    }

    @Transactional
    public CancelAlertResponse resolveAlert(CancelAlertRequest request) {
        User guardian = securityUtils.getCurrentUser();



        BreachEvent breachEvent = breachEventRepository.findById(request.getBreachEventId())
                .orElseThrow(() -> new IllegalArgumentException("Breach event not found"));

        User protectedUser = breachEvent.getProtectedUser();

        // Relationship Validation
        boolean isLinked = emergencyContactRepository.existsByOwnerUserAndLinkedUser(protectedUser, guardian);
        if (!isLinked) {
            throw new UnauthorizedAccessException("You are not authorized to resolve this alert");
        }

        LocalDateTime now = LocalDateTime.now();

        if (breachEvent.getAlertStatus() == AlertStatus.ACTIVE) {
            breachEvent.setAlertStatus(AlertStatus.RESOLVED);
            breachEvent.setResolvedAt(now);
            breachEvent.setResolvedOrCancelledBy(guardian.getFirstName() + " " + guardian.getLastName());
            breachEvent.setUpdatedAt(now);
            breachEventRepository.save(breachEvent);

            // Resolve active tracking session for this guardian and user
            Optional<LiveTrackingSession> sessionOpt = trackingSessionRepository
                    .findByProtectedUserAndGuardianUserAndActiveTrue(protectedUser, guardian);
            if (sessionOpt.isPresent()) {
                LiveTrackingSession session = sessionOpt.get();
                session.setActive(false);
                session.setResolvedAt(now);
                trackingSessionRepository.save(session);
            }

            // If there are no other active breaches, reset the user flags and all other active tracking sessions
            List<BreachEvent> otherActiveBreaches = breachEventRepository.findByProtectedUserAndAlertStatus(protectedUser, AlertStatus.ACTIVE);
            if (otherActiveBreaches.isEmpty()) {
                protectedUser.setCurrentlyOutsideSafeZone(false);
                protectedUser.setLiveTrackingEnabledUntil(null);
                userRepository.save(protectedUser);

                List<LiveTrackingSession> allActiveSessions = trackingSessionRepository.findAllByProtectedUserAndActiveTrue(protectedUser);
                for (LiveTrackingSession s : allActiveSessions) {
                    s.setActive(false);
                    s.setResolvedAt(now);
                    trackingSessionRepository.save(s);
                }
                redisActiveTrackingService.evictActiveLocation(protectedUser.getUserId());
            }

            notificationService.sendAlertCancelledNotification(guardian, protectedUser);
        }

        CancelAlertResponse response = new CancelAlertResponse();
        response.setBreachEventId(breachEvent.getBreachEventId());
        response.setAlertStatus(breachEvent.getAlertStatus().name());
        response.setProcessedAt(now);
        response.setMessage("Alert successfully resolved.");
        return response;
    }
}
