package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.config.EarthquakeRadiusConfig;
import com.CareWave.carewave_backend.dto.EarthquakeResponse;
import com.CareWave.carewave_backend.dto.Feature;
import com.CareWave.carewave_backend.dto.Geometry;
import com.CareWave.carewave_backend.dto.Properties;
import com.CareWave.carewave_backend.entity.DisasterEvent;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.repository.DisasterEventRepository;
import com.CareWave.carewave_backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class EarthquakeMonitoringService {

    private static final Logger log = LoggerFactory.getLogger(EarthquakeMonitoringService.class);

    private final UserRepository userRepository;
    private final DisasterEventRepository disasterEventRepository;
    private final EmergencyUtils emergencyUtils;
    private final NotificationService notificationService;
    private final RestTemplate restTemplate;
    private final GeoFencingService geoFencingService;

    public EarthquakeMonitoringService(
            UserRepository userRepository,
            DisasterEventRepository disasterEventRepository,
            EmergencyUtils emergencyUtils,
            NotificationService notificationService,
            RestTemplate restTemplate,
            GeoFencingService geoFencingService
    ) {
        this.userRepository = userRepository;
        this.disasterEventRepository = disasterEventRepository;
        this.emergencyUtils = emergencyUtils;
        this.notificationService = notificationService;
        this.restTemplate = restTemplate;
        this.geoFencingService = geoFencingService;
    }

    @Transactional
    public void fetchAndProcessEarthquakes() {
        String url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson";
        EarthquakeResponse response;

        try {
            response = restTemplate.getForObject(url, EarthquakeResponse.class);
        } catch (Exception e) {
            log.error("Error fetching USGS earthquake feed: {}", e.getMessage());
            return;
        }

        if (response == null || response.getFeatures() == null) {
            return;
        }

        for (Feature feature : response.getFeatures()) {
            processEarthquake(feature);
        }
    }

    private void processEarthquake(Feature feature) {
        Properties props = feature.getProperties();
        Geometry geom = feature.getGeometry();

        if (props == null || geom == null || props.getMag() == null || geom.getCoordinates() == null || geom.getCoordinates().size() < 2) {
            return;
        }

        double magnitude = props.getMag();
        if (magnitude < 4.5) {
            return;
        }

        String externalId = feature.getId();
        if (disasterEventRepository.existsByExternalEventId(externalId)) {
            return;
        }

        double radiusKm;
        String severity;

        if (magnitude <= 5.4) {
            radiusKm = EarthquakeRadiusConfig.MODERATE_RADIUS_KM;
            severity = "MODERATE";
        } else if (magnitude <= 6.4) {
            radiusKm = EarthquakeRadiusConfig.HIGH_RADIUS_KM;
            severity = "HIGH";
        } else {
            radiusKm = EarthquakeRadiusConfig.CRITICAL_RADIUS_KM;
            severity = "CRITICAL";
        }

        Instant occurredInstant = Instant.ofEpochMilli(props.getTime());
        LocalDateTime occurredAt = LocalDateTime.ofInstant(occurredInstant, ZoneId.systemDefault());

        // Extract coordinates (USGS format is [longitude, latitude, depth])
        double lon = geom.getCoordinates().get(0);
        double lat = geom.getCoordinates().get(1);

        DisasterEvent event = new DisasterEvent();
        event.setExternalEventId(externalId);
        event.setDisasterType("EARTHQUAKE");
        event.setLatitude(lat);
        event.setLongitude(lon);
        event.setMagnitude(magnitude);
        event.setLocationName(props.getPlace());
        event.setSeverity(severity);
        event.setOccurredAt(occurredAt);
        event.setRadiusKm(radiusKm);
        event.setExpiresAt(occurredAt.plusHours(24));

        disasterEventRepository.save(event);

        matchAndAlertUsers(event, radiusKm);
    }

    private void matchAndAlertUsers(DisasterEvent event, double radiusKm) {
        LocalDateTime freshnessThreshold = LocalDateTime.now().minusHours(24);
        List<User> activeUsers = userRepository.findActiveUsersForDisaster(freshnessThreshold);

        double radiusMeters = radiusKm * 1000.0;

        for (User user : activeUsers) {
            double distanceMeters = geoFencingService.calculateDistanceMeters(
                    user.getLastLatitude(),
                    user.getLastLongitude(),
                    event.getLatitude(),
                    event.getLongitude()
            );

            if (distanceMeters <= radiusMeters) {
                // Determine confidence level based on freshness of location update
                long minutesSinceUpdate = Duration.between(user.getLastLocationUpdatedAt(), LocalDateTime.now()).toMinutes();
                String confidenceLevel;

                if (minutesSinceUpdate < 60) {
                    confidenceLevel = "HIGH";
                } else if (minutesSinceUpdate < 120) {
                    confidenceLevel = "MEDIUM";
                } else {
                    confidenceLevel = "LOW";
                }

                log.info("Triggering simplified earthquake alerts for user {} (Confidence: {})", user.getUserId(), confidenceLevel);

                // Notify Affected User
                notificationService.sendEarthquakeAlert(user, user, event, confidenceLevel, false);

                // Notify User's Emergency Contacts (Guardians)
                List<User> guardians = emergencyUtils.getEmergencyContacts(user).stream()
                        .map(c -> c.getLinkedUser())
                        .filter(u -> u != null)
                        .toList();

                for (User guardian : guardians) {
                    notificationService.sendEarthquakeAlert(guardian, user, event, confidenceLevel, true);
                }
            }
        }
    }
}
