package com.CareWave.carewave_backend;

import com.CareWave.carewave_backend.dto.OpenMeteoResponse;
import com.CareWave.carewave_backend.entity.DisasterEvent;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.repository.DisasterEventRepository;
import com.CareWave.carewave_backend.repository.UserRepository;
import com.CareWave.carewave_backend.service.EmergencyUtils;
import com.CareWave.carewave_backend.service.NotificationService;
import com.CareWave.carewave_backend.service.WeatherMonitoringService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WeatherDisasterAlertSystemTests {

    private WeatherMonitoringService weatherMonitoringService;

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
        weatherMonitoringService = new WeatherMonitoringService(
                userRepository,
                disasterEventRepository,
                emergencyUtils,
                notificationService,
                restTemplate,
                geoFencingService
        );
    }

    private OpenMeteoResponse createMockResponse(
            double temp, double windspeed, String windspeedUnit, int weathercode, String time, 
            List<Integer> precipProb, List<Double> hourlyWind, String hourlyWindUnit
    ) {
        OpenMeteoResponse response = new OpenMeteoResponse();
        
        OpenMeteoResponse.CurrentWeather current = new OpenMeteoResponse.CurrentWeather();
        current.setTemperature(temp);
        current.setWindspeed(windspeed);
        current.setWeathercode(weathercode);
        current.setTime(time);
        response.setCurrent_weather(current);
        
        if (windspeedUnit != null) {
            OpenMeteoResponse.CurrentWeatherUnits units = new OpenMeteoResponse.CurrentWeatherUnits();
            units.setWindspeed(windspeedUnit);
            response.setCurrent_weather_units(units);
        }
        
        if (precipProb != null || hourlyWind != null) {
            OpenMeteoResponse.Hourly hourly = new OpenMeteoResponse.Hourly();
            hourly.setPrecipitation_probability(precipProb);
            hourly.setWindspeed_10m(hourlyWind);
            response.setHourly(hourly);
            
            if (hourlyWindUnit != null) {
                OpenMeteoResponse.HourlyUnits hourlyUnits = new OpenMeteoResponse.HourlyUnits();
                hourlyUnits.setWindspeed_10m(hourlyWindUnit);
                response.setHourly_units(hourlyUnits);
            }
        }
        
        return response;
    }

    @Test
    void testWeatherSeverityInference_Kmh() {
        // Critical cyclone based on windspeed > 80 km/h
        OpenMeteoResponse criticalResponse = createMockResponse(25.0, 85.0, "km/h", 3, "2026-05-29T12:00", null, null, null);
        
        User user = new User();
        user.setUserId(java.util.UUID.randomUUID());
        user.setLastLatitude(18.5204);
        user.setLastLongitude(73.8567);
        user.setLastLocationUpdatedAt(LocalDateTime.now().minusMinutes(10));
        
        when(userRepository.findActiveUsersForDisaster(any(LocalDateTime.class))).thenReturn(List.of(user));
        when(restTemplate.getForObject(anyString(), eq(OpenMeteoResponse.class))).thenReturn(criticalResponse);
        when(disasterEventRepository.existsByExternalEventId(anyString())).thenReturn(false);
        when(emergencyUtils.getEmergencyContacts(any(User.class))).thenReturn(new ArrayList<>());

        weatherMonitoringService.fetchAndProcessWeatherAlerts();

        ArgumentCaptor<DisasterEvent> eventCaptor = ArgumentCaptor.forClass(DisasterEvent.class);
        verify(disasterEventRepository).save(eventCaptor.capture());
        
        DisasterEvent savedEvent = eventCaptor.getValue();
        assertEquals("CRITICAL", savedEvent.getSeverity());
        assertEquals("CYCLONE", savedEvent.getDisasterType());
        assertEquals("[CRITICAL] [CYCLONE] Alert Area", savedEvent.getLocationName());
        
        verify(notificationService).sendWeatherAlert(eq(user), eq(user), eq(savedEvent), eq("HIGH"), eq(false));
    }

    @Test
    void testWindspeedUnitConversion_MsToKmh() {
        // 25 m/s = 25 * 3.6 = 90 km/h -> should trigger CRITICAL CYCLONE
        OpenMeteoResponse msResponse = createMockResponse(22.0, 25.0, "m/s", 1, "2026-05-29T12:00", null, null, null);
        
        User user = new User();
        user.setUserId(java.util.UUID.randomUUID());
        user.setLastLatitude(18.5204);
        user.setLastLongitude(73.8567);
        user.setLastLocationUpdatedAt(LocalDateTime.now().minusMinutes(10));
        
        when(userRepository.findActiveUsersForDisaster(any(LocalDateTime.class))).thenReturn(List.of(user));
        when(restTemplate.getForObject(anyString(), eq(OpenMeteoResponse.class))).thenReturn(msResponse);
        when(disasterEventRepository.existsByExternalEventId(anyString())).thenReturn(false);
        
        weatherMonitoringService.fetchAndProcessWeatherAlerts();

        ArgumentCaptor<DisasterEvent> eventCaptor = ArgumentCaptor.forClass(DisasterEvent.class);
        verify(disasterEventRepository).save(eventCaptor.capture());
        
        DisasterEvent savedEvent = eventCaptor.getValue();
        assertEquals("CRITICAL", savedEvent.getSeverity());
        assertEquals("CYCLONE", savedEvent.getDisasterType());
    }

    @Test
    void testPrecipitationFallbackSafety() {
        // Hourly block is missing, should still evaluate using weathercode (95 -> High Storm) and windspeed
        OpenMeteoResponse fallbackResponse = createMockResponse(20.0, 10.0, "km/h", 95, "2026-05-29T12:00", null, null, null);
        
        User user = new User();
        user.setUserId(java.util.UUID.randomUUID());
        user.setLastLatitude(18.5204);
        user.setLastLongitude(73.8567);
        user.setLastLocationUpdatedAt(LocalDateTime.now().minusMinutes(10));
        
        when(userRepository.findActiveUsersForDisaster(any(LocalDateTime.class))).thenReturn(List.of(user));
        when(restTemplate.getForObject(anyString(), eq(OpenMeteoResponse.class))).thenReturn(fallbackResponse);
        when(disasterEventRepository.existsByExternalEventId(anyString())).thenReturn(false);
        
        // This execution must run successfully without throwing exceptions
        assertDoesNotThrow(() -> weatherMonitoringService.fetchAndProcessWeatherAlerts());

        ArgumentCaptor<DisasterEvent> eventCaptor = ArgumentCaptor.forClass(DisasterEvent.class);
        verify(disasterEventRepository).save(eventCaptor.capture());
        
        DisasterEvent savedEvent = eventCaptor.getValue();
        assertEquals("HIGH", savedEvent.getSeverity());
        assertEquals("STORM", savedEvent.getDisasterType());
    }

    @Test
    void testRepresentativeGrouping() {
        User user1 = new User();
        user1.setLastLatitude(18.5204);
        user1.setLastLongitude(73.8567);

        User user2 = new User();
        user2.setLastLatitude(18.5250); // within 50km of user1
        user2.setLastLongitude(73.8580);

        User user3 = new User();
        user3.setLastLatitude(28.7041); // Far away
        user3.setLastLongitude(77.1025);

        List<User> activeUsers = List.of(user1, user2, user3);
        when(userRepository.findActiveUsersForDisaster(any(LocalDateTime.class))).thenReturn(activeUsers);

        OpenMeteoResponse mockResponse = createMockResponse(25.0, 12.0, "km/h", 0, "2026-05-29T12:00", null, null, null);
        when(restTemplate.getForObject(anyString(), eq(OpenMeteoResponse.class))).thenReturn(mockResponse);

        // Access private method fetchAndProcessWeatherAlerts via Reflection
        ReflectionTestUtils.invokeMethod(weatherMonitoringService, "fetchAndProcessWeatherAlerts");

        // The Open-Meteo API should be called twice (once for user1/user2 group, once for user3)
        verify(restTemplate, times(2)).getForObject(anyString(), eq(OpenMeteoResponse.class));
    }

    @Test
    void testMatchAndAlertUsers_WeatherConfidence() {
        DisasterEvent event = new DisasterEvent();
        event.setLatitude(18.5204);
        event.setLongitude(73.8567);
        event.setDisasterType("FLOOD");
        event.setSeverity("CRITICAL");
        event.setLocationName("Heavy Rainfall");

        User userHigh = new User();
        userHigh.setLastLatitude(18.5210);
        userHigh.setLastLongitude(73.8570);
        userHigh.setLastLocationUpdatedAt(LocalDateTime.now().minusMinutes(25)); // HIGH confidence

        User userMedium = new User();
        userMedium.setLastLatitude(18.5210);
        userMedium.setLastLongitude(73.8570);
        userMedium.setLastLocationUpdatedAt(LocalDateTime.now().minusMinutes(75)); // MEDIUM confidence

        User userLow = new User();
        userLow.setLastLatitude(18.5210);
        userLow.setLastLongitude(73.8570);
        userLow.setLastLocationUpdatedAt(LocalDateTime.now().minusHours(3)); // LOW confidence

        List<User> activeUsers = List.of(userHigh, userMedium, userLow);
        when(emergencyUtils.getEmergencyContacts(any(User.class))).thenReturn(new ArrayList<>());

        ReflectionTestUtils.invokeMethod(weatherMonitoringService, "matchAndAlertUsers", event, activeUsers);

        // Verify HIGH confidence user
        verify(notificationService).sendWeatherAlert(eq(userHigh), eq(userHigh), eq(event), eq("HIGH"), eq(false));

        // Verify MEDIUM confidence user
        verify(notificationService).sendWeatherAlert(eq(userMedium), eq(userMedium), eq(event), eq("MEDIUM"), eq(false));

        // Verify LOW confidence user
        verify(notificationService).sendWeatherAlert(eq(userLow), eq(userLow), eq(event), eq("LOW"), eq(false));
    }
}
