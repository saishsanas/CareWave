package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.dto.OpenMeteoResponse;
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
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class WeatherMonitoringService {

    private static final Logger log = LoggerFactory.getLogger(WeatherMonitoringService.class);

    private final UserRepository userRepository;
    private final DisasterEventRepository disasterEventRepository;
    private final EmergencyUtils emergencyUtils;
    private final NotificationService notificationService;
    private final RestTemplate restTemplate;
    private final GeoFencingService geoFencingService;

    public WeatherMonitoringService(
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
    public void fetchAndProcessWeatherAlerts() {
        LocalDateTime freshnessThreshold = LocalDateTime.now().minusHours(24);
        List<User> activeUsers = userRepository.findActiveUsersForDisaster(freshnessThreshold);

        if (activeUsers.isEmpty()) {
            log.info("No active users found for weather monitoring.");
            return;
        }

        // Group representative locations (within 50 km) to avoid duplicate weather API calls
        List<User> representativeLocations = new ArrayList<>();
        for (User user : activeUsers) {
            boolean represented = false;
            for (User rep : representativeLocations) {
                double distanceMeters = geoFencingService.calculateDistanceMeters(
                        user.getLastLatitude(),
                        user.getLastLongitude(),
                        rep.getLastLatitude(),
                        rep.getLastLongitude()
                );
                if (distanceMeters <= 50000.0) { // 50 km threshold
                    represented = true;
                    break;
                }
            }
            if (!represented) {
                representativeLocations.add(user);
            }
        }

        log.info("Processing weather alerts for {} representative locations (grouped from {} active users).", 
                representativeLocations.size(), activeUsers.size());

        for (User rep : representativeLocations) {
            processLocationWeather(rep, activeUsers);
        }
    }

    private void processLocationWeather(User rep, List<User> activeUsers) {
        double lat = rep.getLastLatitude();
        double lon = rep.getLastLongitude();
        String url = String.format(Locale.US,
                "https://api.open-meteo.com/v1/forecast?latitude=%f&longitude=%f&current_weather=true&hourly=precipitation_probability,windspeed_10m&windspeed_unit=kmh", 
                lat, lon);

        OpenMeteoResponse response;
        try {
            response = restTemplate.getForObject(url, OpenMeteoResponse.class);
        } catch (Exception e) {
            log.error("Error calling Open-Meteo API for coordinates ({}, {}): {}", lat, lon, e.getMessage());
            return;
        }

        if (response == null || response.getCurrent_weather() == null) {
            return;
        }

        processOpenMeteoData(response, lat, lon, activeUsers);
    }

    private void processOpenMeteoData(OpenMeteoResponse response, double alertLat, double alertLon, List<User> activeUsers) {
        OpenMeteoResponse.CurrentWeather current = response.getCurrent_weather();
        String time = current.getTime();
        if (time == null || time.isBlank()) {
            return;
        }

        int weathercode = current.getWeathercode();
        
        // 1. Windspeed Unit Verification & Conversion
        double currentWindspeed = current.getWindspeed();
        String currentWindspeedUnit = response.getCurrent_weather_units() != null ? response.getCurrent_weather_units().getWindspeed() : null;
        double convertedCurrentWindspeed = convertWindspeedToKmh(currentWindspeed, currentWindspeedUnit);

        int maxPrecipProb = 0;
        double maxHourlyWindspeedKmh = 0.0;

        if (response.getHourly() != null) {
            List<Integer> precipProbList = response.getHourly().getPrecipitation_probability();
            if (precipProbList != null && !precipProbList.isEmpty()) {
                for (Integer prob : precipProbList) {
                    if (prob != null && prob > maxPrecipProb) {
                        maxPrecipProb = prob;
                    }
                }
            }

            List<Double> hourlyWindspeeds = response.getHourly().getWindspeed_10m();
            if (hourlyWindspeeds != null && !hourlyWindspeeds.isEmpty()) {
                String hourlyWindspeedUnit = response.getHourly_units() != null ? response.getHourly_units().getWindspeed_10m() : null;
                for (Double speed : hourlyWindspeeds) {
                    if (speed != null) {
                        double convertedSpeed = convertWindspeedToKmh(speed, hourlyWindspeedUnit);
                        if (convertedSpeed > maxHourlyWindspeedKmh) {
                            maxHourlyWindspeedKmh = convertedSpeed;
                        }
                    }
                }
            }
        }

        double effectiveWindspeed = Math.max(convertedCurrentWindspeed, maxHourlyWindspeedKmh);

        // 2. Weather Severity Inference Rules
        String severity = null;
        String disasterType = null;

        if (effectiveWindspeed >= 80.0) {
            severity = "CRITICAL";
            disasterType = "CYCLONE";
        } else if (effectiveWindspeed >= 50.0 || weathercode == 95 || weathercode == 96 || weathercode == 99) {
            severity = "HIGH";
            disasterType = "STORM";
        } else if (weathercode == 82 || (maxPrecipProb > 90 && weathercode == 65)) {
            severity = "HIGH";
            disasterType = "FLOOD_RISK";
        } else if (weathercode == 63 || weathercode == 65 || weathercode == 80 || weathercode == 81 || maxPrecipProb > 70) {
            severity = "MODERATE";
            disasterType = "HEAVY_RAIN";
        }

        // If it does not qualify as moderate, high or critical, skip alerting
        if (severity == null || disasterType == null) {
            return;
        }

        LocalDateTime occurredAt;
        try {
            occurredAt = LocalDateTime.parse(time);
        } catch (Exception e) {
            occurredAt = LocalDateTime.now();
        }

        String dateStr = occurredAt.toLocalDate().toString();
        String region = getRegionName(alertLat, alertLon);
        String externalId = "weather-" + disasterType.toLowerCase() + "-" + region + "-" + dateStr;

        // Check if there is an active (non-expired) event of the same type in this geographic area
        java.util.List<DisasterEvent> activeEvents = disasterEventRepository.findByDisasterTypeAndExpiresAtAfter(disasterType, LocalDateTime.now());
        for (DisasterEvent existing : activeEvents) {
            double distanceMeters = geoFencingService.calculateDistanceMeters(
                    existing.getLatitude(), existing.getLongitude(), alertLat, alertLon
            );
            double warningRadiusMeters = existing.getRadiusKm() * 1000.0;
            // If the event is in the same geographic area (within 1.5 times its radius, or within 100km)
            if (distanceMeters <= Math.max(warningRadiusMeters * 1.5, 100000.0)) {
                // If severity has not changed, update expiration time and suppress alert/duplicate creation
                if (existing.getSeverity().equals(severity)) {
                    existing.setExpiresAt(occurredAt.plusHours(24));
                    disasterEventRepository.save(existing);
                    log.info("Suppressed duplicate weather alert creation for ongoing event: {}", existing.getExternalEventId());
                    return;
                }
            }
        }

        // Check if this specific external ID already exists
        if (disasterEventRepository.existsByExternalEventId(externalId)) {
            return;
        }

        double radiusKm = "CYCLONE".equals(disasterType) ? 200.0
                : ("STORM".equals(disasterType) || "FLOOD_RISK".equals(disasterType)) ? 100.0
                : 50.0;

        DisasterEvent event = new DisasterEvent();
        event.setExternalEventId(externalId);
        event.setDisasterType(disasterType);
        event.setLatitude(alertLat);
        event.setLongitude(alertLon);
        event.setSeverity(severity);
        event.setLocationName(String.format("[%s] [%s] Alert Area", severity, disasterType));
        event.setOccurredAt(occurredAt);
        event.setRadiusKm(radiusKm);
        event.setExpiresAt(occurredAt.plusHours(24));

        disasterEventRepository.save(event);

        matchAndAlertUsers(event, activeUsers);
    }

    private String getRegionName(double lat, double lon) {
        double distToMumbai = geoFencingService.calculateDistanceMeters(lat, lon, 19.0760, 72.8777);
        if (distToMumbai <= 100000.0) {
            return "mumbai";
        }
        double distToPune = geoFencingService.calculateDistanceMeters(lat, lon, 18.5204, 73.8567);
        if (distToPune <= 100000.0) {
            return "pune";
        }
        return String.format(Locale.US, "lat%.2f-lon%.2f", lat, lon);
    }

    private double convertWindspeedToKmh(double windspeed, String unit) {
        if (unit == null || unit.isBlank()) {
            return windspeed;
        }
        String lowerUnit = unit.trim().toLowerCase();
        if (lowerUnit.contains("m/s") || lowerUnit.equals("ms") || lowerUnit.contains("mps")) {
            return windspeed * 3.6;
        } else if (lowerUnit.contains("mph")) {
            return windspeed * 1.60934;
        } else if (lowerUnit.equals("kn") || lowerUnit.contains("knot")) {
            return windspeed * 1.852;
        }
        return windspeed;
    }

    private void matchAndAlertUsers(DisasterEvent event, List<User> activeUsers) {
        if ("HEAVY_RAIN".equals(event.getDisasterType())) {
            log.info("Skipping FCM dispatch for MODERATE HEAVY_RAIN event.");
            return;
        }

        double radiusKm = "CRITICAL".equals(event.getSeverity()) ? 200.0
                : "HIGH".equals(event.getSeverity()) ? 100.0
                : 50.0;

        double radiusMeters = radiusKm * 1000.0;

        for (User user : activeUsers) {
            double distanceMeters = geoFencingService.calculateDistanceMeters(
                    user.getLastLatitude(),
                    user.getLastLongitude(),
                    event.getLatitude(),
                    event.getLongitude()
            );

            if (distanceMeters <= radiusMeters) {
                long minutesSinceUpdate = Duration.between(user.getLastLocationUpdatedAt(), LocalDateTime.now()).toMinutes();
                String confidenceLevel;

                if (minutesSinceUpdate < 60) {
                    confidenceLevel = "HIGH";
                } else if (minutesSinceUpdate < 120) {
                    confidenceLevel = "MEDIUM";
                } else {
                    confidenceLevel = "LOW";
                }

                log.info("Triggering weather alerts for user {} (Confidence: {})", user.getUserId(), confidenceLevel);

                // Notify User
                notificationService.sendWeatherAlert(user, user, event, confidenceLevel, false);

                // Notify User's Emergency Contacts (Guardians)
                List<User> guardians = emergencyUtils.getEmergencyContacts(user).stream()
                        .map(c -> c.getLinkedUser())
                        .filter(u -> u != null)
                        .toList();

                for (User guardian : guardians) {
                    notificationService.sendWeatherAlert(guardian, user, event, confidenceLevel, true);
                }
            }
        }
    }
}
