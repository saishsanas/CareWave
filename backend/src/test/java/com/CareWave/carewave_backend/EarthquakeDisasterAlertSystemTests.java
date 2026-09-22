package com.CareWave.carewave_backend;

import com.CareWave.carewave_backend.config.EarthquakeRadiusConfig;
import com.CareWave.carewave_backend.dto.Feature;
import com.CareWave.carewave_backend.dto.Geometry;
import com.CareWave.carewave_backend.dto.Properties;
import com.CareWave.carewave_backend.entity.DisasterEvent;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.repository.DisasterEventRepository;
import com.CareWave.carewave_backend.repository.UserRepository;
import com.CareWave.carewave_backend.service.EarthquakeMonitoringService;
import com.CareWave.carewave_backend.service.EmergencyUtils;
import com.CareWave.carewave_backend.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EarthquakeDisasterAlertSystemTests {

    private EarthquakeMonitoringService earthquakeMonitoringService;

    @Mock private UserRepository userRepository;
    @Mock private DisasterEventRepository disasterEventRepository;
    @Mock private EmergencyUtils emergencyUtils;
    @Mock private NotificationService notificationService;
    @Mock private RestTemplate restTemplate;
    private com.CareWave.carewave_backend.service.GeoFencingService geoFencingService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        geoFencingService = new com.CareWave.carewave_backend.service.GeoFencingService();
        earthquakeMonitoringService = new EarthquakeMonitoringService(
                userRepository,
                disasterEventRepository,
                emergencyUtils,
                notificationService,
                restTemplate,
                geoFencingService
        );
    }

    @Test
    void testProcessFeature_LowMagnitudeBypassed() {
        Feature feature = new Feature();
        feature.setId("us1000abcd");
        
        Properties props = new Properties();
        props.setMag(4.0); // Below 4.5
        props.setPlace("10km E of California");
        props.setTime(System.currentTimeMillis());
        feature.setProperties(props);

        Geometry geom = new Geometry();
        geom.setCoordinates(List.of(-122.4194, 37.7749));
        feature.setGeometry(geom);

        ReflectionTestUtils.invokeMethod(earthquakeMonitoringService, "processEarthquake", feature);

        verify(disasterEventRepository, never()).save(any(DisasterEvent.class));
    }

    @Test
    void testProcessFeature_DuplicateEventBypassed() {
        Feature feature = new Feature();
        feature.setId("us1000abcd");
        
        Properties props = new Properties();
        props.setMag(5.5);
        props.setPlace("10km E of California");
        props.setTime(System.currentTimeMillis());
        feature.setProperties(props);

        Geometry geom = new Geometry();
        geom.setCoordinates(List.of(-122.4194, 37.7749));
        feature.setGeometry(geom);

        when(disasterEventRepository.existsByExternalEventId("us1000abcd")).thenReturn(true);

        ReflectionTestUtils.invokeMethod(earthquakeMonitoringService, "processEarthquake", feature);

        verify(disasterEventRepository, times(1)).existsByExternalEventId("us1000abcd");
        verify(disasterEventRepository, never()).save(any(DisasterEvent.class));
    }

    @Test
    void testProcessFeature_DynamicSeverityAndRadiusMapping() {
        Feature feature = new Feature();
        feature.setId("us1000abcd");
        
        Properties props = new Properties();
        props.setMag(6.8); // CRITICAL
        props.setPlace("Off the coast of Alaska");
        props.setTime(System.currentTimeMillis());
        feature.setProperties(props);

        Geometry geom = new Geometry();
        geom.setCoordinates(List.of(-150.0, 60.0)); // coordinates are longitude, latitude
        feature.setGeometry(geom);

        when(disasterEventRepository.existsByExternalEventId("us1000abcd")).thenReturn(false);

        ReflectionTestUtils.invokeMethod(earthquakeMonitoringService, "processEarthquake", feature);

        verify(disasterEventRepository, times(1)).save(argThat(event -> {
            assertEquals("CRITICAL", event.getSeverity());
            assertEquals(60.0, event.getLatitude());
            assertEquals(-150.0, event.getLongitude());
            return true;
        }));
    }

    @Test
    void testMatchAndAlertUsers_ConfidenceLevels() {
        DisasterEvent event = new DisasterEvent();
        event.setLatitude(37.7749);
        event.setLongitude(-122.4194);
        event.setMagnitude(5.0);
        event.setSeverity("MODERATE");
        event.setLocationName("California");

        User userHigh = new User();
        userHigh.setLastLatitude(37.7750);
        userHigh.setLastLongitude(-122.4195);
        userHigh.setLastLocationUpdatedAt(LocalDateTime.now().minusMinutes(20)); // HIGH confidence

        User userMedium = new User();
        userMedium.setLastLatitude(37.7750);
        userMedium.setLastLongitude(-122.4195);
        userMedium.setLastLocationUpdatedAt(LocalDateTime.now().minusMinutes(80)); // MEDIUM confidence

        User userLow = new User();
        userLow.setLastLatitude(37.7750);
        userLow.setLastLongitude(-122.4195);
        userLow.setLastLocationUpdatedAt(LocalDateTime.now().minusHours(4)); // LOW confidence

        List<User> activeUsers = List.of(userHigh, userMedium, userLow);

        when(userRepository.findActiveUsersForDisaster(any(LocalDateTime.class))).thenReturn(activeUsers);
        // Match within 80km (Moderate radius)
        ReflectionTestUtils.invokeMethod(earthquakeMonitoringService, "matchAndAlertUsers", event, EarthquakeRadiusConfig.MODERATE_RADIUS_KM);

        // Verify High confidence user alert
        verify(notificationService).sendEarthquakeAlert(eq(userHigh), eq(userHigh), eq(event), eq("HIGH"), eq(false));

        // Verify Medium confidence user alert
        verify(notificationService).sendEarthquakeAlert(eq(userMedium), eq(userMedium), eq(event), eq("MEDIUM"), eq(false));

        // Verify Low confidence user alert
        verify(notificationService).sendEarthquakeAlert(eq(userLow), eq(userLow), eq(event), eq("LOW"), eq(false));
    }
}
