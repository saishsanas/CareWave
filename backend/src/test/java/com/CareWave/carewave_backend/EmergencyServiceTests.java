package com.CareWave.carewave_backend;

import com.CareWave.carewave_backend.dto.EmergencyRequest;
import com.CareWave.carewave_backend.entity.EmergencyContact;
import com.CareWave.carewave_backend.entity.EmergencyEvent;
import com.CareWave.carewave_backend.entity.LiveTrackingSession;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.enums.EmergencyStatus;
import com.CareWave.carewave_backend.enums.EmergencyType;
import com.CareWave.carewave_backend.repository.EmergencyRepository;
import com.CareWave.carewave_backend.repository.UserRepository;
import com.CareWave.carewave_backend.repository.LiveTrackingSessionRepository;
import com.CareWave.carewave_backend.service.EmergencyService;
import com.CareWave.carewave_backend.service.EmergencyUtils;
import com.CareWave.carewave_backend.service.NotificationService;
import com.CareWave.carewave_backend.service.MedicalEmergencyService;
import com.CareWave.carewave_backend.service.PoliceEmergencyService;
import com.CareWave.carewave_backend.service.FireEmergencyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EmergencyServiceTests {

    private EmergencyService emergencyService;

    @Mock private EmergencyRepository emergencyRepository;
    @Mock private MedicalEmergencyService medicalEmergencyService;
    @Mock private PoliceEmergencyService policeEmergencyService;
    @Mock private FireEmergencyService fireEmergencyService;
    @Mock private UserRepository userRepository;
    @Mock private LiveTrackingSessionRepository trackingSessionRepository;
    @Mock private EmergencyUtils emergencyUtils;
    @Mock private NotificationService notificationService;
    @Mock private com.CareWave.carewave_backend.repository.EmergencyContactRepository emergencyContactRepository;
    @Mock private com.CareWave.carewave_backend.security.SecurityUtils securityUtils;
    @Mock private com.CareWave.carewave_backend.service.EmergencyEventProducer emergencyEventProducer;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        emergencyService = new EmergencyService(
                emergencyRepository,
                medicalEmergencyService,
                policeEmergencyService,
                fireEmergencyService,
                userRepository,
                trackingSessionRepository,
                emergencyUtils,
                notificationService,
                emergencyContactRepository,
                securityUtils,
                emergencyEventProducer
        );
    }

    @Test
    void testCreateWomenSafetyEmergency() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setUserId(userId);
        user.setFirstName("Jane");
        user.setLastName("Doe");

        UUID guardianId = UUID.randomUUID();
        User guardian = new User();
        guardian.setUserId(guardianId);
        guardian.setFirstName("John");
        guardian.setLastName("Guardian");

        EmergencyContact contact = new EmergencyContact();
        contact.setLinkedUser(guardian);

        EmergencyRequest request = new EmergencyRequest();
        request.setUserId(userId);
        request.setEmergencyType(EmergencyType.PERSONAL_SAFETY);
        request.setLatitude(37.7749);
        request.setLongitude(-122.4194);

        // Mock saved emergency event
        EmergencyEvent mockSavedEvent = new EmergencyEvent();
        mockSavedEvent.setEmergencyId(UUID.randomUUID());
        mockSavedEvent.setUserId(userId);
        mockSavedEvent.setEmergencyType(EmergencyType.PERSONAL_SAFETY);
        mockSavedEvent.setEmergencyStatus(EmergencyStatus.ACTIVE);
        mockSavedEvent.setLatitude(37.7749);
        mockSavedEvent.setLongitude(-122.4194);

        when(emergencyRepository.findByUserIdAndEmergencyStatus(eq(userId), any())).thenReturn(new ArrayList<>());
        when(emergencyRepository.save(any(EmergencyEvent.class))).thenReturn(mockSavedEvent);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(emergencyUtils.getEmergencyContacts(user)).thenReturn(List.of(contact));
        when(trackingSessionRepository.findByProtectedUserAndGuardianUserAndActiveTrue(user, guardian)).thenReturn(Optional.empty());

        EmergencyEvent event = emergencyService.createEmergencyEvent(request);

        assertNotNull(event);
        assertEquals(EmergencyType.PERSONAL_SAFETY, event.getEmergencyType());
        assertEquals(EmergencyStatus.ACTIVE, event.getEmergencyStatus());

        // Verify user tracking updated
        verify(userRepository).save(user);
        assertNotNull(user.getLiveTrackingEnabledUntil());

        // Verify FCM user alert
        verify(notificationService).sendWomenSafetyAlertToUser(user, mockSavedEvent);

        // Verify LiveTrackingSession creation
        ArgumentCaptor<LiveTrackingSession> sessionCaptor = ArgumentCaptor.forClass(LiveTrackingSession.class);
        verify(trackingSessionRepository).save(sessionCaptor.capture());
        LiveTrackingSession session = sessionCaptor.getValue();
        assertEquals(user, session.getProtectedUser());
        assertEquals(guardian, session.getGuardianUser());
        assertEquals("PERSONAL_SAFETY", session.getTriggeredByEventType());
        assertTrue(session.getActive());

        // Verify FCM contact alert
        verify(notificationService).sendWomenSafetyAlertToContact(guardian, user, mockSavedEvent);
    }

    @Test
    void testCreateMedicalEmergency() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setUserId(userId);
        user.setFirstName("Jane");
        user.setLastName("Doe");

        UUID guardianId = UUID.randomUUID();
        User guardian = new User();
        guardian.setUserId(guardianId);
        guardian.setFirstName("John");
        guardian.setLastName("Guardian");

        EmergencyContact contact = new EmergencyContact();
        contact.setLinkedUser(guardian);

        EmergencyRequest request = new EmergencyRequest();
        request.setUserId(userId);
        request.setEmergencyType(EmergencyType.MEDICAL);
        request.setLatitude(37.7749);
        request.setLongitude(-122.4194);

        // Mock saved emergency event
        EmergencyEvent mockSavedEvent = new EmergencyEvent();
        mockSavedEvent.setEmergencyId(UUID.randomUUID());
        mockSavedEvent.setUserId(userId);
        mockSavedEvent.setEmergencyType(EmergencyType.MEDICAL);
        mockSavedEvent.setEmergencyStatus(EmergencyStatus.ACTIVE);
        mockSavedEvent.setLatitude(37.7749);
        mockSavedEvent.setLongitude(-122.4194);

        when(emergencyRepository.findByUserIdAndEmergencyStatus(eq(userId), any())).thenReturn(new ArrayList<>());
        when(emergencyRepository.save(any(EmergencyEvent.class))).thenReturn(mockSavedEvent);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(emergencyUtils.getEmergencyContacts(user)).thenReturn(List.of(contact));
        when(trackingSessionRepository.findByProtectedUserAndGuardianUserAndActiveTrue(user, guardian)).thenReturn(Optional.empty());

        EmergencyEvent event = emergencyService.createEmergencyEvent(request);

        assertNotNull(event);
        assertEquals(EmergencyType.MEDICAL, event.getEmergencyType());
        assertEquals(EmergencyStatus.ACTIVE, event.getEmergencyStatus());

        // Verify user tracking updated
        verify(userRepository).save(user);
        assertNotNull(user.getLiveTrackingEnabledUntil());

        // Verify LiveTrackingSession creation
        ArgumentCaptor<LiveTrackingSession> sessionCaptor = ArgumentCaptor.forClass(LiveTrackingSession.class);
        verify(trackingSessionRepository).save(sessionCaptor.capture());
        LiveTrackingSession session = sessionCaptor.getValue();
        assertEquals(user, session.getProtectedUser());
        assertEquals(guardian, session.getGuardianUser());
        assertEquals("MEDICAL", session.getTriggeredByEventType());
        assertTrue(session.getActive());

        // Verify medicalEmergencyService was called
        verify(medicalEmergencyService).handleMedicalEmergency(mockSavedEvent);
    }

    @Test
    void testCreateEmergencyThrowsWhenAlreadyActive() {
        UUID userId = UUID.randomUUID();
        EmergencyRequest request = new EmergencyRequest();
        request.setUserId(userId);

        EmergencyEvent activeEvent = new EmergencyEvent();
        activeEvent.setUserId(userId);
        activeEvent.setEmergencyStatus(EmergencyStatus.ACTIVE);

        when(emergencyRepository.findByUserIdAndEmergencyStatus(eq(userId), any())).thenReturn(List.of(activeEvent));

        assertThrows(com.CareWave.carewave_backend.exception.ActiveEmergencyExistsException.class, () -> {
            emergencyService.createEmergencyEvent(request);
        });
    }

    @Test
    void testCancelEmergencySuccess() {
        UUID userId = UUID.randomUUID();
        User currentUser = new User();
        currentUser.setUserId(userId);

        UUID emergencyId = UUID.randomUUID();
        EmergencyEvent activeEvent = new EmergencyEvent();
        activeEvent.setEmergencyId(emergencyId);
        activeEvent.setUserId(userId);
        activeEvent.setEmergencyStatus(EmergencyStatus.ACTIVE);

        when(securityUtils.getCurrentUser()).thenReturn(currentUser);
        when(emergencyRepository.findById(emergencyId)).thenReturn(Optional.of(activeEvent));
        when(emergencyRepository.save(any(EmergencyEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EmergencyEvent cancelled = emergencyService.cancelEmergency(emergencyId);

        assertEquals(EmergencyStatus.CANCELLED, cancelled.getEmergencyStatus());
        assertNotNull(cancelled.getResolvedAt());
    }

    @Test
    void testResolveEmergencySuccess() {
        UUID userId = UUID.randomUUID();
        User currentUser = new User();
        currentUser.setUserId(userId);

        UUID emergencyId = UUID.randomUUID();
        EmergencyEvent activeEvent = new EmergencyEvent();
        activeEvent.setEmergencyId(emergencyId);
        activeEvent.setUserId(userId);
        activeEvent.setEmergencyStatus(EmergencyStatus.ACTIVE);

        when(securityUtils.getCurrentUser()).thenReturn(currentUser);
        when(emergencyRepository.findById(emergencyId)).thenReturn(Optional.of(activeEvent));
        when(emergencyRepository.save(any(EmergencyEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EmergencyEvent resolved = emergencyService.resolveEmergency(emergencyId);
 
        assertEquals(EmergencyStatus.RESOLVED, resolved.getEmergencyStatus());
        assertNotNull(resolved.getResolvedAt());
    }

    @Test
    void testGetActiveEmergency_OwnActive() {
        UUID userId = UUID.randomUUID();
        EmergencyEvent activeEvent = new EmergencyEvent();
        activeEvent.setUserId(userId);
        activeEvent.setEmergencyStatus(EmergencyStatus.ACTIVE);

        when(emergencyRepository.findByUserIdAndEmergencyStatus(userId, EmergencyStatus.ACTIVE))
                .thenReturn(List.of(activeEvent));

        Optional<EmergencyEvent> result = emergencyService.getActiveEmergency(userId);

        assertTrue(result.isPresent());
        assertEquals(userId, result.get().getUserId());
        assertEquals(EmergencyStatus.ACTIVE, result.get().getEmergencyStatus());
        verify(emergencyRepository, never()).findActiveParticipatingEmergencies(any(), any());
    }

    @Test
    void testGetActiveEmergency_ParticipatingActive() {
        UUID userId = UUID.randomUUID();
        UUID victimId = UUID.randomUUID();
        EmergencyEvent activeEvent = new EmergencyEvent();
        activeEvent.setUserId(victimId);
        activeEvent.setEmergencyStatus(EmergencyStatus.ACTIVE);

        when(emergencyRepository.findByUserIdAndEmergencyStatus(userId, EmergencyStatus.ACTIVE))
                .thenReturn(new ArrayList<>());
        when(emergencyRepository.findActiveParticipatingEmergencies(userId, EmergencyStatus.ACTIVE))
                .thenReturn(List.of(activeEvent));

        Optional<EmergencyEvent> result = emergencyService.getActiveEmergency(userId);

        assertTrue(result.isPresent());
        assertEquals(victimId, result.get().getUserId());
        assertEquals(EmergencyStatus.ACTIVE, result.get().getEmergencyStatus());
    }

    @Test
    void testGetActiveEmergency_None() {
        UUID userId = UUID.randomUUID();

        when(emergencyRepository.findByUserIdAndEmergencyStatus(userId, EmergencyStatus.ACTIVE))
                .thenReturn(new ArrayList<>());
        when(emergencyRepository.findActiveParticipatingEmergencies(userId, EmergencyStatus.ACTIVE))
                .thenReturn(new ArrayList<>());

        Optional<EmergencyEvent> result = emergencyService.getActiveEmergency(userId);

        assertTrue(result.isEmpty());
    }
}

