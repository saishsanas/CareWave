package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.dto.TrackingStatusResponse;
import com.CareWave.carewave_backend.dto.UpdateUserLocationRequest;
import com.CareWave.carewave_backend.entity.BreachEvent;
import com.CareWave.carewave_backend.entity.LiveTrackingSession;
import com.CareWave.carewave_backend.entity.SafeZone;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.enums.AlertStatus;
import com.CareWave.carewave_backend.enums.LocationFreshnessStatus;
import com.CareWave.carewave_backend.exception.RateLimitExceededException;
import com.CareWave.carewave_backend.exception.UserNotFoundException;
import com.CareWave.carewave_backend.exception.UnauthorizedAccessException;
import com.CareWave.carewave_backend.repository.BreachEventRepository;
import com.CareWave.carewave_backend.repository.EmergencyContactRepository;
import com.CareWave.carewave_backend.repository.LiveTrackingSessionRepository;
import com.CareWave.carewave_backend.repository.SafeZoneRepository;
import com.CareWave.carewave_backend.repository.UserRepository;
import com.CareWave.carewave_backend.security.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserLocationService {

    private static final Logger log = LoggerFactory.getLogger(UserLocationService.class);


    private final UserRepository userRepository;
    private final SafeZoneRepository safeZoneRepository;
    private final BreachEventRepository breachEventRepository;
    private final LiveTrackingSessionRepository trackingSessionRepository;
    private final EmergencyContactRepository emergencyContactRepository;
    private final GeoFencingService geoFencingService;
    private final NotificationService notificationService;
    private final SecurityUtils securityUtils;
    private final EmergencyUtils emergencyUtils;
    private final RedisActiveTrackingService redisActiveTrackingService;

    public UserLocationService(
            UserRepository userRepository,
            SafeZoneRepository safeZoneRepository,
            BreachEventRepository breachEventRepository,
            LiveTrackingSessionRepository trackingSessionRepository,
            EmergencyContactRepository emergencyContactRepository,
            GeoFencingService geoFencingService,
            NotificationService notificationService,
            SecurityUtils securityUtils,
            EmergencyUtils emergencyUtils,
            RedisActiveTrackingService redisActiveTrackingService
    ) {
        this.userRepository = userRepository;
        this.safeZoneRepository = safeZoneRepository;
        this.breachEventRepository = breachEventRepository;
        this.trackingSessionRepository = trackingSessionRepository;
        this.emergencyContactRepository = emergencyContactRepository;
        this.geoFencingService = geoFencingService;
        this.notificationService = notificationService;
        this.securityUtils = securityUtils;
        this.emergencyUtils = emergencyUtils;
        this.redisActiveTrackingService = redisActiveTrackingService;
    }

    @org.springframework.transaction.annotation.Transactional
    public void updateUserLocation(UpdateUserLocationRequest request) {
        User user = securityUtils.getCurrentUser();
        LocalDateTime now = LocalDateTime.now();

        // 1. Rate Limiting Check (10-second threshold)
        if (user.getLastLocationUpdatedAt() != null) {
            long secondsSinceLastUpdate = Duration.between(user.getLastLocationUpdatedAt(), now).getSeconds();
            if (secondsSinceLastUpdate < 10) {
                throw new RateLimitExceededException("Please wait at least 10 seconds between location updates.");
            }
        }

        // 2. GPS Disabled Flow
        if (request.getGpsEnabled() != null && !Boolean.TRUE.equals(request.getGpsEnabled())) {
            user.setGpsEnabled(false);
            user.setLastLocationUpdatedAt(now);
            user.setLiveTrackingEnabledUntil(now.plusMinutes(30));
            userRepository.save(user);

            triggerGpsDisabledBreach(user);
            return;
        }

        // 3. Significant Movement Check (20 meters)
        boolean hasMovedSignificantly = true;
        if (user.getCurrentLatitude() != null && user.getCurrentLongitude() != null 
                && Boolean.TRUE.equals(user.getGpsEnabled())) {
            double movementDistance = geoFencingService.calculateDistanceMeters(
                    user.getCurrentLatitude(),
                    user.getCurrentLongitude(),
                    request.getLatitude(),
                    request.getLongitude()
            );
            if (movementDistance < 20.0) {
                hasMovedSignificantly = false;
            }
        }

        // Update basic location info
        user.setCurrentLatitude(request.getLatitude());
        user.setCurrentLongitude(request.getLongitude());
        user.setLastLatitude(request.getLatitude());
        user.setLastLongitude(request.getLongitude());
        user.setGpsEnabled(user.getGpsEnabled() != null ? user.getGpsEnabled() : true);
        user.setLastLocationUpdatedAt(now);
        userRepository.save(user);

        // Cache active location in Redis if user has active live tracking session/emergency
        if (user.getLiveTrackingEnabledUntil() != null && user.getLiveTrackingEnabledUntil().isAfter(now)) {
            redisActiveTrackingService.cacheActiveLocation(
                    user.getUserId(),
                    request.getLatitude(),
                    request.getLongitude(),
                    now.toString(),
                    user.getGpsEnabled()
            );
        }


        // Evaluate geo-fencing ONLY if movement is significant (or GPS state changed)
        if (hasMovedSignificantly) {
            evaluateGeoFencing(user);
        }
    }

    public TrackingStatusResponse getProtectedUserLocationStatus(UUID protectedUserId) {
        User guardian = securityUtils.getCurrentUser();

        User protectedUser = userRepository.findById(protectedUserId)
                .orElseThrow(() -> new UserNotFoundException("Protected user not found"));

        // Relationship Validation
        boolean isLinked = emergencyContactRepository.existsByOwnerUserAndLinkedUser(protectedUser, guardian);
        if (!isLinked) {
            throw new UnauthorizedAccessException("You are not authorized to view the location of this user");
        }

        // Check if there is an active tracking session
        Optional<LiveTrackingSession> activeSession = trackingSessionRepository
                .findByProtectedUserAndGuardianUserAndActiveTrue(protectedUser, guardian);

        boolean isTrackingActive = activeSession.isPresent() && activeSession.get().getExpiresAt().isAfter(LocalDateTime.now());

        if (!isTrackingActive) {
            throw new UnauthorizedAccessException("User location is private. Sharing is only active during emergencies.");
        }

        TrackingStatusResponse response = new TrackingStatusResponse();
        response.setProtectedUserId(protectedUser.getUserId());
        response.setProtectedUserName(protectedUser.getFirstName() + " " + protectedUser.getLastName());
        response.setLastLocationUpdatedAt(protectedUser.getLastLocationUpdatedAt());
        response.setGpsEnabled(protectedUser.getGpsEnabled());
        response.setTrackingActive(isTrackingActive);


        if (activeSession.isPresent()) {
            response.setSessionId(activeSession.get().getSessionId());
            response.setTriggeredByEventType(activeSession.get().getTriggeredByEventType());
            response.setExpiresAt(activeSession.get().getExpiresAt());
        }

        // Freshness status calculation
        response.setFreshnessStatus(calculateLocationFreshness(protectedUser).name());

        // Last known location fallback: exposure is allowed but indicates status (continuous tracking indicator is false if expired)
        response.setCurrentLatitude(protectedUser.getCurrentLatitude());
        response.setCurrentLongitude(protectedUser.getCurrentLongitude());

        return response;
    }

    private LocationFreshnessStatus calculateLocationFreshness(User user) {
        if (!Boolean.TRUE.equals(user.getGpsEnabled())) {
            return LocationFreshnessStatus.GPS_DISABLED;
        }
        if (user.getLastLocationUpdatedAt() == null) {
            return LocationFreshnessStatus.OFFLINE_LOCATION;
        }

        long elapsedMinutes = Duration.between(user.getLastLocationUpdatedAt(), LocalDateTime.now()).toMinutes();
        if (elapsedMinutes <= 5) {
            return LocationFreshnessStatus.ACTIVE_LOCATION;
        } else if (elapsedMinutes <= 30) {
            return LocationFreshnessStatus.STALE_LOCATION;
        } else {
            return LocationFreshnessStatus.OFFLINE_LOCATION;
        }
    }

    private void evaluateGeoFencing(User user) {
        List<SafeZone> activeZones = safeZoneRepository.findByProtectedUserAndActiveTrue(user);
        LocalDateTime now = LocalDateTime.now();

        boolean currentlyOutsideAnyZone = false;
        SafeZone breachedZone = null;

        if (!activeZones.isEmpty()) {
            boolean insideAtLeastOneZone = false;
            for (SafeZone zone : activeZones) {
                boolean isInside = geoFencingService.isWithinRadius(
                        user.getCurrentLatitude(),
                        user.getCurrentLongitude(),
                        zone.getCenterLatitude(),
                        zone.getCenterLongitude(),
                        zone.getRadiusMeters()
                );
                if (isInside) {
                    insideAtLeastOneZone = true;
                    break;
                }
            }
            if (!insideAtLeastOneZone) {
                currentlyOutsideAnyZone = true;
                breachedZone = activeZones.get(0); // Choose the first as reference breached zone
            }
        }

        if (currentlyOutsideAnyZone) {
            // Already flagged as outside?
            if (Boolean.TRUE.equals(user.getCurrentlyOutsideSafeZone())) {
                return;
            }

            // Exit Cooldown (Breach Persistence Duration of 60 seconds)
            if (user.getPendingExitSince() == null) {
                user.setPendingExitSince(now);
                userRepository.save(user);
                log.info("User entered pending safe-zone exit state. Exit cooldown initiated.");
            } else {
                long secondsOutside = Duration.between(user.getPendingExitSince(), now).getSeconds();
                if (secondsOutside >= 60) {
                    // Confirm exit breach
                    user.setCurrentlyOutsideSafeZone(true);
                    user.setPendingExitSince(null);
                    user.setLiveTrackingEnabledUntil(now.plusMinutes(30));
                    userRepository.save(user);

                    // Log breach event
                    BreachEvent event = new BreachEvent();
                    event.setProtectedUser(user);
                    event.setSafeZone(breachedZone);
                    event.setEventType("ZONE_EXIT");
                    event.setAlertStatus(AlertStatus.ACTIVE);
                    event.setOccurredAt(now);
                    event.setUpdatedAt(now);
                    breachEventRepository.save(event);

                    // Trigger alerts and activate sessions for guardians
                    triggerBreachAlerts(user, breachedZone, "ZONE_EXIT");
                }
            }
        } else {
            // Inside all zones. Clear pending exit if user bounced back
            if (user.getPendingExitSince() != null) {
                user.setPendingExitSince(null);
                userRepository.save(user);
            }

            // Resolve active OFFLINE breaches if any when coming online inside safe zone
            List<BreachEvent> activeOffline = breachEventRepository.findByProtectedUserAndAlertStatus(user, AlertStatus.ACTIVE);
            for (BreachEvent event : activeOffline) {
                if ("OFFLINE".equals(event.getEventType())) {
                    event.setAlertStatus(AlertStatus.RESOLVED);
                    event.setResolvedAt(now);
                    event.setResolvedOrCancelledBy("SYSTEM_AUTO");
                    event.setUpdatedAt(now);
                    breachEventRepository.save(event);

                    // Deactivate tracking sessions
                    List<LiveTrackingSession> activeSessions = trackingSessionRepository.findAllByProtectedUserAndActiveTrue(user);
                    for (LiveTrackingSession session : activeSessions) {
                        session.setActive(false);
                        session.setResolvedAt(now);
                        trackingSessionRepository.save(session);
                    }
                }
            }

            // Were they previously flagged as outside?
            if (Boolean.TRUE.equals(user.getCurrentlyOutsideSafeZone())) {
                user.setCurrentlyOutsideSafeZone(false);
                userRepository.save(user);

                // Resolve active breaches
                List<BreachEvent> activeEvents = breachEventRepository.findByProtectedUserAndAlertStatus(user, AlertStatus.ACTIVE);
                for (BreachEvent event : activeEvents) {
                    event.setAlertStatus(AlertStatus.RESOLVED);
                    event.setResolvedAt(now);
                    event.setResolvedOrCancelledBy("SYSTEM_AUTO");
                    event.setUpdatedAt(now);
                    breachEventRepository.save(event);
                }

                // Deactivate sessions
                List<LiveTrackingSession> activeSessions = trackingSessionRepository.findAllByProtectedUserAndActiveTrue(user);

                for (LiveTrackingSession session : activeSessions) {
                    session.setActive(false);
                    session.setResolvedAt(now);
                    trackingSessionRepository.save(session);

                    notificationService.sendTrackingExpiredAlert(session.getGuardianUser(), user);
                }

                // Send return alert
                notifyGuardiansReturn(user, breachedZone);
            }
        }
    }

    private void triggerGpsDisabledBreach(User user) {
        LocalDateTime now = LocalDateTime.now();

        // Prevent duplicate active GPS disabled alerts
        boolean alreadyLogged = breachEventRepository
                .findFirstByProtectedUserAndAlertStatusOrderByOccurredAtDesc(user, AlertStatus.ACTIVE)
                .map(b -> b.getEventType().equals("GPS_DISABLED"))
                .orElse(false);

        if (!alreadyLogged) {
            BreachEvent event = new BreachEvent();
            event.setProtectedUser(user);
            event.setEventType("GPS_DISABLED");
            event.setAlertStatus(AlertStatus.ACTIVE);
            event.setOccurredAt(now);
            event.setUpdatedAt(now);
            breachEventRepository.save(event);

            triggerBreachAlerts(user, null, "GPS_DISABLED");
        }
    }

    private void triggerBreachAlerts(User user, SafeZone zone, String eventType) {
        LocalDateTime now = LocalDateTime.now();

        // 10-Minute Alert Cooldown for duplicate alerts (ignoring the event currently being processed)
        List<BreachEvent> activeEvents = breachEventRepository
                .findByProtectedUserAndAlertStatus(user, AlertStatus.ACTIVE);

        for (BreachEvent prev : activeEvents) {
            if (prev.getEventType().equals(eventType) && Duration.between(prev.getOccurredAt(), now).getSeconds() > 2) {
                long secondsSinceLastAlert = Duration.between(prev.getOccurredAt(), now).getSeconds();
                if (secondsSinceLastAlert < 600) { // 10 minutes
                    log.info("Alert suppressed due to 10-minute duplicate alert cooldown.");
                    return;
                }
            }
        }

        List<User> guardians = emergencyUtils.getEmergencyContacts(user).stream()
                .map(c -> c.getLinkedUser())
                .filter(u -> u != null)
                .toList();

        for (User guardian : guardians) {
            // Activate tracking session
            boolean sessionExists = trackingSessionRepository
                    .findByProtectedUserAndGuardianUserAndActiveTrue(user, guardian)
                    .isPresent();

            if (!sessionExists) {
                LiveTrackingSession session = new LiveTrackingSession();
                session.setGuardianUser(guardian);
                session.setProtectedUser(user);
                session.setTriggeredByEventType(eventType);
                session.setStartedAt(now);
                session.setExpiresAt(now.plusMinutes(30));
                session.setActive(true);
                session.setAutoExpired(false);
                trackingSessionRepository.save(session);
            }

            if ("ZONE_EXIT".equals(eventType)) {
                notificationService.sendSafeZoneBreachAlert(guardian, user, zone != null ? zone.getZoneName() : "Unknown Zone");
            } else if ("GPS_DISABLED".equals(eventType)) {
                notificationService.sendGpsDisabledAlert(guardian, user);
            }
            notificationService.sendTrackingActivatedAlert(guardian, user, 30);
        }
    }

    private void notifyGuardiansReturn(User user, SafeZone zone) {
        List<User> guardians = emergencyUtils.getEmergencyContacts(user).stream()
                .map(c -> c.getLinkedUser())
                .filter(u -> u != null)
                .toList();

        for (User guardian : guardians) {
            notificationService.sendReturnToSafeZoneAlert(guardian, user);
        }
    }
}
