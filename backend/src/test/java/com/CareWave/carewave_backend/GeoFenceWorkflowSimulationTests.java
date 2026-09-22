package com.CareWave.carewave_backend;

import com.CareWave.carewave_backend.dto.LiveLocationResponse;
import com.CareWave.carewave_backend.dto.UpdateUserLocationRequest;
import com.CareWave.carewave_backend.entity.BreachEvent;
import com.CareWave.carewave_backend.entity.EmergencyContact;
import com.CareWave.carewave_backend.entity.LiveTrackingSession;
import com.CareWave.carewave_backend.entity.SafeZone;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.enums.AlertStatus;
import com.CareWave.carewave_backend.enums.BloodGroup;
import com.CareWave.carewave_backend.enums.Gender;
import com.CareWave.carewave_backend.enums.Relation;
import com.CareWave.carewave_backend.exception.UnauthorizedAccessException;
import com.CareWave.carewave_backend.repository.BreachEventRepository;
import com.CareWave.carewave_backend.repository.EmergencyContactRepository;
import com.CareWave.carewave_backend.repository.LiveTrackingSessionRepository;
import com.CareWave.carewave_backend.repository.SafeZoneRepository;
import com.CareWave.carewave_backend.repository.UserRepository;
import com.CareWave.carewave_backend.repository.NotificationHistoryRepository;
import com.CareWave.carewave_backend.service.MedicalEmergencyService;
import com.CareWave.carewave_backend.service.UserLocationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class GeoFenceWorkflowSimulationTests {

    private static final Logger log = LoggerFactory.getLogger(GeoFenceWorkflowSimulationTests.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SafeZoneRepository safeZoneRepository;

    @Autowired
    private BreachEventRepository breachEventRepository;

    @Autowired
    private LiveTrackingSessionRepository trackingSessionRepository;

    @Autowired
    private EmergencyContactRepository emergencyContactRepository;

    @Autowired
    private NotificationHistoryRepository notificationHistoryRepository;

    @Autowired
    private UserLocationService userLocationService;

    @Autowired
    private MedicalEmergencyService medicalEmergencyService;

    private User protectedUser;
    private User guardian;
    private SafeZone safeZone;
    private EmergencyContact linkedContact;

    @BeforeEach
    void setUp() {
        // Clear old test data if any
        cleanup();

        // 1. Create Protected User (Phone A)
        protectedUser = new User();
        protectedUser.setFirstName("Protected");
        protectedUser.setLastName("User");
        protectedUser.setEmail("protected@simulation.com");
        protectedUser.setContactNumber("9999999991");
        protectedUser.setPassword("password");
        protectedUser.setGender(Gender.MALE);
        protectedUser.setBloodGroup(BloodGroup.O_POSITIVE);
        protectedUser.setGpsEnabled(true);
        protectedUser = userRepository.save(protectedUser);

        // 2. Create Guardian (Phone B)
        guardian = new User();
        guardian.setFirstName("Guardian");
        guardian.setLastName("User");
        guardian.setEmail("guardian@simulation.com");
        guardian.setContactNumber("9999999992");
        guardian.setPassword("password");
        guardian.setGender(Gender.FEMALE);
        guardian.setBloodGroup(BloodGroup.A_POSITIVE);
        guardian.setFcmToken("mock_guardian_fcm_token");
        guardian = userRepository.save(guardian);

        // 3. Link them as Emergency Contacts
        linkedContact = new EmergencyContact();
        linkedContact.setOwnerUser(protectedUser);
        linkedContact.setLinkedUser(guardian);
        linkedContact.setContactNumber(guardian.getContactNumber());
        linkedContact.setFullName("My Guardian");
        linkedContact.setRelation(Relation.GUARDIAN);
        linkedContact = emergencyContactRepository.save(linkedContact);

        // 4. Create Safe Zone centered in Pune (Radius: 500m)
        safeZone = new SafeZone();
        safeZone.setZoneName("Home Pune");
        safeZone.setGuardianUser(guardian);
        safeZone.setProtectedUser(protectedUser);
        safeZone.setCenterLatitude(18.5204);
        safeZone.setCenterLongitude(73.8567);
        safeZone.setRadiusMeters(500.0);
        safeZone.setActive(true);
        safeZone.setCreatedAt(LocalDateTime.now());
        safeZone.setUpdatedAt(LocalDateTime.now());
        safeZone = safeZoneRepository.save(safeZone);
    }

    @AfterEach
    void tearDown() {
        cleanup();
    }

    private void cleanup() {
        SecurityContextHolder.clearContext();
        breachEventRepository.deleteAll();
        trackingSessionRepository.deleteAll();
        safeZoneRepository.deleteAll();
        emergencyContactRepository.deleteAll();
        notificationHistoryRepository.deleteAll();
        userRepository.deleteAll();
    }

    private void loginAs(User user) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user.getEmail(), null, Collections.emptyList())
        );
    }

    @Test
    void testGeoFenceEndToEndWorkflowSimulation() {
        log.info("[SIMULATION START] Beginning GeoFence Workflow Simulation Test");

        // ==========================================
        // STAGE 0: Initial State Verification
        // ==========================================
        log.info("[STAGE 0] Checking Initial State");
        List<BreachEvent> initialBreaches = breachEventRepository.findByProtectedUserAndAlertStatus(protectedUser, AlertStatus.ACTIVE);
        List<LiveTrackingSession> initialSessions = trackingSessionRepository.findAllByProtectedUserAndActiveTrue(protectedUser);
        
        assertTrue(initialBreaches.isEmpty(), "Should not have active breaches initially");
        assertTrue(initialSessions.isEmpty(), "Should not have active tracking sessions initially");
        log.info("[STAGE 0] Initial state is clean.");

        // ==========================================
        // STAGE 1: Location updates Inside Safe Zone
        // ==========================================
        log.info("[STAGE 1] Simulating coordinates inside safe zone (0m distance to center)");
        loginAs(protectedUser);

        UpdateUserLocationRequest insideRequest1 = new UpdateUserLocationRequest();
        insideRequest1.setLatitude(18.5204);
        insideRequest1.setLongitude(73.8567);
        insideRequest1.setGpsEnabled(true);
        
        userLocationService.updateUserLocation(insideRequest1);

        // Assert no breach triggered
        List<BreachEvent> insideBreaches = breachEventRepository.findByProtectedUserAndAlertStatus(protectedUser, AlertStatus.ACTIVE);
        List<LiveTrackingSession> insideSessions = trackingSessionRepository.findAllByProtectedUserAndActiveTrue(protectedUser);
        
        assertTrue(insideBreaches.isEmpty(), "No breaches should be created inside safe zone");
        assertTrue(insideSessions.isEmpty(), "No tracking sessions should be created inside safe zone");
        log.info("[STAGE 1] PASS: Inside Safe Zone updates do not trigger breaches.");

        // ==========================================
        // STAGE 2: Exit Safe Zone (Breach & Notification)
        // ==========================================
        log.info("[STAGE 2] Simulating exit from Safe Zone (1.1 km outside)");
        
        // Rate limiting requires waiting 10s between updates in database, we can update lastLocationUpdatedAt back in DB
        protectedUser = userRepository.findById(protectedUser.getUserId()).get();
        protectedUser.setLastLocationUpdatedAt(LocalDateTime.now().minusSeconds(15));
        userRepository.save(protectedUser);

        UpdateUserLocationRequest outsideRequest1 = new UpdateUserLocationRequest();
        outsideRequest1.setLatitude(18.5304); // Outside the 500m Pune center boundary
        outsideRequest1.setLongitude(73.8567);
        outsideRequest1.setGpsEnabled(true);

        userLocationService.updateUserLocation(outsideRequest1);

        // Verification: Cooldown initiated (pendingExitSince set)
        protectedUser = userRepository.findById(protectedUser.getUserId()).get();
        assertNotNull(protectedUser.getPendingExitSince(), "Pending exit cooldown should be initiated");
        log.info("[STAGE 2] Exit cooldown initiated at: {}", protectedUser.getPendingExitSince());

        // Fast-forward cooldown by setting pendingExitSince back by 75 seconds in DB
        protectedUser.setPendingExitSince(LocalDateTime.now().minusSeconds(75));
        protectedUser.setLastLocationUpdatedAt(LocalDateTime.now().minusSeconds(15));
        userRepository.save(protectedUser);

        // Send second update outside to confirm exit breach
        UpdateUserLocationRequest outsideRequest2 = new UpdateUserLocationRequest();
        outsideRequest2.setLatitude(18.5310);
        outsideRequest2.setLongitude(73.8567);
        outsideRequest2.setGpsEnabled(true);

        userLocationService.updateUserLocation(outsideRequest2);

        // Verification: Breach detected, sessions created
        protectedUser = userRepository.findById(protectedUser.getUserId()).get();
        assertTrue(protectedUser.getCurrentlyOutsideSafeZone(), "Should be flagged as outside safe zone");
        assertNull(protectedUser.getPendingExitSince(), "Pending cooldown should be cleared");

        List<BreachEvent> exitBreaches = breachEventRepository.findByProtectedUserAndAlertStatus(protectedUser, AlertStatus.ACTIVE);
        assertEquals(1, exitBreaches.size(), "Exactly one active breach event should exist");
        assertEquals("ZONE_EXIT", exitBreaches.get(0).getEventType(), "Breach event should be of type ZONE_EXIT");

        List<LiveTrackingSession> activeSessions = trackingSessionRepository.findAllByProtectedUserAndActiveTrue(protectedUser);
        assertEquals(1, activeSessions.size(), "Exactly one active tracking session should exist");

        // Verify duplicate alert suppression (sending subsequent breach coordinates doesn't duplicate)
        protectedUser.setLastLocationUpdatedAt(LocalDateTime.now().minusSeconds(15));
        userRepository.save(protectedUser);

        UpdateUserLocationRequest outsideRequest3 = new UpdateUserLocationRequest();
        outsideRequest3.setLatitude(18.5320);
        outsideRequest3.setLongitude(73.8567);
        outsideRequest3.setGpsEnabled(true);

        userLocationService.updateUserLocation(outsideRequest3);

        // Assert notification history and active sessions remain single
        List<LiveTrackingSession> activeSessionsAfterDup = trackingSessionRepository.findAllByProtectedUserAndActiveTrue(protectedUser);
        assertEquals(1, activeSessionsAfterDup.size(), "No duplicate tracking sessions should be created");

        log.info("[STAGE 2] PASS: Safe zone exit breach detected and LiveTrackingSession activated.");

        // ==========================================
        // STAGES 3 & 4: Guardian Tracking & updates
        // ==========================================
        log.info("[STAGE 3 & 4] Simulating Guardian live tracking lookup");
        loginAs(guardian);

        UUID activeSessionId = activeSessions.get(0).getSessionId();
        
        // Guardian fetches tracking coordinates
        LiveLocationResponse liveLocation = medicalEmergencyService.getLiveLocationInfo(activeSessionId);
        
        assertNotNull(liveLocation);
        assertEquals(18.5320, liveLocation.getLatitude(), 0.0001, "Should return latest updated latitude");
        assertEquals(73.8567, liveLocation.getLongitude(), 0.0001, "Should return latest updated longitude");
        log.info("[STAGE 3 & 4] Guardian successfully read coordinates: {}, {}", liveLocation.getLatitude(), liveLocation.getLongitude());

        // Simulate further movement
        loginAs(protectedUser);
        protectedUser = userRepository.findById(protectedUser.getUserId()).get();
        protectedUser.setLastLocationUpdatedAt(LocalDateTime.now().minusSeconds(15));
        userRepository.save(protectedUser);

        UpdateUserLocationRequest outsideRequest4 = new UpdateUserLocationRequest();
        outsideRequest4.setLatitude(18.5350);
        outsideRequest4.setLongitude(73.8570);
        outsideRequest4.setGpsEnabled(true);
        userLocationService.updateUserLocation(outsideRequest4);

        // Guardian reads coordinates again
        loginAs(guardian);
        LiveLocationResponse updatedLocation = medicalEmergencyService.getLiveLocationInfo(activeSessionId);
        assertEquals(18.5350, updatedLocation.getLatitude(), 0.0001);
        assertEquals(73.8570, updatedLocation.getLongitude(), 0.0001);
        log.info("[STAGE 3 & 4] PASS: Guardian live-coordinates updated correctly to: {}, {}", updatedLocation.getLatitude(), updatedLocation.getLongitude());

        // ==========================================
        // STAGE 5: Return Inside Safe Zone (Deactivation)
        // ==========================================
        log.info("[STAGE 5] Simulating user return inside safe zone");
        loginAs(protectedUser);
        protectedUser = userRepository.findById(protectedUser.getUserId()).get();
        protectedUser.setLastLocationUpdatedAt(LocalDateTime.now().minusSeconds(15));
        userRepository.save(protectedUser);

        UpdateUserLocationRequest returnRequest = new UpdateUserLocationRequest();
        returnRequest.setLatitude(18.5204); // Back inside
        returnRequest.setLongitude(73.8567);
        returnRequest.setGpsEnabled(true);
        userLocationService.updateUserLocation(returnRequest);

        // Verification: Breach resolved, sessions inactive
        protectedUser = userRepository.findById(protectedUser.getUserId()).get();
        assertFalse(protectedUser.getCurrentlyOutsideSafeZone(), "Flag should be false (inside safe zone)");

        List<BreachEvent> resolvedBreaches = breachEventRepository.findByProtectedUserAndAlertStatus(protectedUser, AlertStatus.ACTIVE);
        assertTrue(resolvedBreaches.isEmpty(), "Active breach should be resolved and closed");

        List<LiveTrackingSession> resolvedSessions = trackingSessionRepository.findAllByProtectedUserAndActiveTrue(protectedUser);
        assertTrue(resolvedSessions.isEmpty(), "Live tracking session should be deactivated");

        // Verify guardian is blocked from further updates
        loginAs(guardian);
        assertThrows(UnauthorizedAccessException.class, () -> {
            medicalEmergencyService.getLiveLocationInfo(activeSessionId);
        }, "Should throw exception as tracking session is now inactive");
        
        log.info("[STAGE 5] PASS: Safe-zone re-entry resolved breach and deactivated tracking session.");

        // ==========================================
        // STAGE 6: Database Verification
        // ==========================================
        log.info("[STAGE 6] Verifying database integrity");
        assertEquals(0, breachEventRepository.findByProtectedUserAndAlertStatus(protectedUser, AlertStatus.ACTIVE).size());
        assertEquals(0, trackingSessionRepository.findAllByProtectedUserAndActiveTrue(protectedUser).size());
        log.info("[STAGE 6] PASS: Database integrity is consistent, zero orphan active sessions remaining.");
        
        log.info("[SIMULATION END] GeoFence end-to-end integration simulation completed successfully.");
    }
}
