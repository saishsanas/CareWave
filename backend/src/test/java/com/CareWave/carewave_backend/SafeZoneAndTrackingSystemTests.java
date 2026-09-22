package com.CareWave.carewave_backend;

import com.CareWave.carewave_backend.dto.UpdateUserLocationRequest;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.exception.RateLimitExceededException;
import com.CareWave.carewave_backend.repository.BreachEventRepository;
import com.CareWave.carewave_backend.repository.EmergencyContactRepository;
import com.CareWave.carewave_backend.repository.LiveTrackingSessionRepository;
import com.CareWave.carewave_backend.repository.SafeZoneRepository;
import com.CareWave.carewave_backend.repository.UserRepository;
import com.CareWave.carewave_backend.security.SecurityUtils;
import com.CareWave.carewave_backend.service.EmergencyUtils;
import com.CareWave.carewave_backend.service.GeoFencingService;
import com.CareWave.carewave_backend.service.NotificationService;
import com.CareWave.carewave_backend.service.RedisActiveTrackingService;
import com.CareWave.carewave_backend.service.UserLocationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SafeZoneAndTrackingSystemTests {

    private UserLocationService userLocationService;

    @Mock private UserRepository userRepository;
    @Mock private SafeZoneRepository safeZoneRepository;
    @Mock private BreachEventRepository breachEventRepository;
    @Mock private LiveTrackingSessionRepository trackingSessionRepository;
    @Mock private EmergencyContactRepository emergencyContactRepository;
    @Mock private GeoFencingService geoFencingService;
    @Mock private NotificationService notificationService;
    @Mock private SecurityUtils securityUtils;
    @Mock private EmergencyUtils emergencyUtils;
    @Mock private RedisActiveTrackingService redisActiveTrackingService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        userLocationService = new UserLocationService(
                userRepository,
                safeZoneRepository,
                breachEventRepository,
                trackingSessionRepository,
                emergencyContactRepository,
                geoFencingService,
                notificationService,
                securityUtils,
                emergencyUtils,
                redisActiveTrackingService
        );
    }

    @Test
    void testUpdateUserLocation_RateLimitExceeded() {
        User user = new User();
        user.setLastLocationUpdatedAt(LocalDateTime.now().minusSeconds(5));

        when(securityUtils.getCurrentUser()).thenReturn(user);

        UpdateUserLocationRequest request = new UpdateUserLocationRequest();
        request.setGpsEnabled(true);
        request.setLatitude(37.7749);
        request.setLongitude(-122.4194);

        assertThrows(RateLimitExceededException.class, () -> {
            userLocationService.updateUserLocation(request);
        });

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testUpdateUserLocation_GpsDisabled() {
        User user = new User();
        user.setLastLocationUpdatedAt(LocalDateTime.now().minusSeconds(15));
        user.setGpsEnabled(true);

        when(securityUtils.getCurrentUser()).thenReturn(user);
        when(emergencyUtils.getEmergencyContacts(user)).thenReturn(new ArrayList<>());

        UpdateUserLocationRequest request = new UpdateUserLocationRequest();
        request.setGpsEnabled(false);

        userLocationService.updateUserLocation(request);

        assertFalse(user.getGpsEnabled());
        assertNotNull(user.getLiveTrackingEnabledUntil());
        verify(userRepository, times(1)).save(user);
    }

    @Test
    void testUpdateUserLocation_NoSignificantMovement() {
        User user = new User();
        user.setLastLocationUpdatedAt(LocalDateTime.now().minusSeconds(15));
        user.setGpsEnabled(true);
        user.setCurrentLatitude(37.7749);
        user.setCurrentLongitude(-122.4194);

        when(securityUtils.getCurrentUser()).thenReturn(user);
        when(geoFencingService.calculateDistanceMeters(37.7749, -122.4194, 37.7750, -122.4195)).thenReturn(15.0);

        UpdateUserLocationRequest request = new UpdateUserLocationRequest();
        request.setGpsEnabled(true);
        request.setLatitude(37.7750);
        request.setLongitude(-122.4195);

        userLocationService.updateUserLocation(request);

        // Saved coordinates should still update
        assertEquals(37.7750, user.getCurrentLatitude());
        assertEquals(-122.4195, user.getCurrentLongitude());
        verify(userRepository, times(1)).save(user);
        // But geofencing should not be queried since movement < 20 meters
        verify(safeZoneRepository, never()).findByProtectedUserAndActiveTrue(any(User.class));
    }

    @Test
    void testUpdateUserLocation_InsideAtLeastOneZone_AnyZoneSafe() {
        User user = new User();
        user.setLastLocationUpdatedAt(LocalDateTime.now().minusSeconds(15));
        user.setGpsEnabled(true);

        when(securityUtils.getCurrentUser()).thenReturn(user);

        // Define 2 active safe zones
        com.CareWave.carewave_backend.entity.SafeZone zoneA = new com.CareWave.carewave_backend.entity.SafeZone();
        zoneA.setCenterLatitude(37.7749);
        zoneA.setCenterLongitude(-122.4194);
        zoneA.setRadiusMeters(100.0);

        com.CareWave.carewave_backend.entity.SafeZone zoneB = new com.CareWave.carewave_backend.entity.SafeZone();
        zoneB.setCenterLatitude(37.8000);
        zoneB.setCenterLongitude(-122.4500);
        zoneB.setRadiusMeters(100.0);

        java.util.List<com.CareWave.carewave_backend.entity.SafeZone> activeZones = java.util.List.of(zoneA, zoneB);
        when(safeZoneRepository.findByProtectedUserAndActiveTrue(user)).thenReturn(activeZones);

        // Mock geoFencingService: user is inside zoneA but outside zoneB
        when(geoFencingService.isWithinRadius(eq(37.7749), eq(-122.4194), eq(zoneA.getCenterLatitude()), eq(zoneA.getCenterLongitude()), eq(zoneA.getRadiusMeters()))).thenReturn(true);
        when(geoFencingService.isWithinRadius(eq(37.7749), eq(-122.4194), eq(zoneB.getCenterLatitude()), eq(zoneB.getCenterLongitude()), eq(zoneB.getRadiusMeters()))).thenReturn(false);

        UpdateUserLocationRequest request = new UpdateUserLocationRequest();
        request.setGpsEnabled(true);
        request.setLatitude(37.7749);
        request.setLongitude(-122.4194);

        userLocationService.updateUserLocation(request);

        // Verify user is considered safe (inside at least one zone)
        assertFalse(Boolean.TRUE.equals(user.getCurrentlyOutsideSafeZone()));
        assertNull(user.getPendingExitSince());
        verify(breachEventRepository, never()).save(any());
    }

    @Test
    void testUpdateUserLocation_OutsideAllZones_BreachTriggered() {
        User user = new User();
        user.setLastLocationUpdatedAt(LocalDateTime.now().minusSeconds(15));
        user.setGpsEnabled(true);

        when(securityUtils.getCurrentUser()).thenReturn(user);

        // Define 2 active safe zones
        com.CareWave.carewave_backend.entity.SafeZone zoneA = new com.CareWave.carewave_backend.entity.SafeZone();
        zoneA.setCenterLatitude(37.7749);
        zoneA.setCenterLongitude(-122.4194);
        zoneA.setRadiusMeters(100.0);

        com.CareWave.carewave_backend.entity.SafeZone zoneB = new com.CareWave.carewave_backend.entity.SafeZone();
        zoneB.setCenterLatitude(37.8000);
        zoneB.setCenterLongitude(-122.4500);
        zoneB.setRadiusMeters(100.0);

        java.util.List<com.CareWave.carewave_backend.entity.SafeZone> activeZones = java.util.List.of(zoneA, zoneB);
        when(safeZoneRepository.findByProtectedUserAndActiveTrue(user)).thenReturn(activeZones);

        // Mock geoFencingService: user is outside BOTH zoneA and zoneB
        when(geoFencingService.isWithinRadius(eq(37.7749), eq(-122.4194), eq(zoneA.getCenterLatitude()), eq(zoneA.getCenterLongitude()), eq(zoneA.getRadiusMeters()))).thenReturn(false);
        when(geoFencingService.isWithinRadius(eq(37.7749), eq(-122.4194), eq(zoneB.getCenterLatitude()), eq(zoneB.getCenterLongitude()), eq(zoneB.getRadiusMeters()))).thenReturn(false);

        UpdateUserLocationRequest request = new UpdateUserLocationRequest();
        request.setGpsEnabled(true);
        request.setLatitude(37.7749);
        request.setLongitude(-122.4194);

        userLocationService.updateUserLocation(request);

        // Verify breach cooldown is initiated (getPendingExitSince is set)
        assertNotNull(user.getPendingExitSince());
        verify(userRepository, atLeastOnce()).save(user);
    }
}
