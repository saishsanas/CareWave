package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.entity.EmergencyContact;
import com.CareWave.carewave_backend.entity.EmergencyEvent;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.enums.EmergencyStatus;
import com.CareWave.carewave_backend.exception.EmergencyNotFoundException;
import com.CareWave.carewave_backend.exception.UnauthorizedAccessException;
import com.CareWave.carewave_backend.exception.UserNotFoundException;
import com.CareWave.carewave_backend.repository.EmergencyContactRepository;
import com.CareWave.carewave_backend.repository.EmergencyRepository;
import com.CareWave.carewave_backend.repository.UserRepository;
import com.CareWave.carewave_backend.security.SecurityUtils;
import com.CareWave.carewave_backend.repository.BreachEventRepository;
import com.CareWave.carewave_backend.repository.LiveTrackingSessionRepository;
import com.CareWave.carewave_backend.entity.BreachEvent;
import com.CareWave.carewave_backend.entity.LiveTrackingSession;
import com.CareWave.carewave_backend.enums.AlertStatus;
import com.CareWave.carewave_backend.dto.LiveLocationResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class MedicalEmergencyService {

    private static final Logger log = LoggerFactory.getLogger(MedicalEmergencyService.class);

    private final UserRepository userRepository;
    private final EmergencyUtils emergencyUtils;
    private final EmergencyRepository emergencyRepository;
    private final EmergencyContactRepository emergencyContactRepository;
    private final NotificationService notificationService;
    private final SecurityUtils securityUtils;
    private final BreachEventRepository breachEventRepository;
    private final LiveTrackingSessionRepository trackingSessionRepository;

    public MedicalEmergencyService(
            UserRepository userRepository,
            EmergencyUtils emergencyUtils,
            EmergencyRepository emergencyRepository,
            EmergencyContactRepository emergencyContactRepository,
            NotificationService notificationService,
            SecurityUtils securityUtils,
            BreachEventRepository breachEventRepository,
            LiveTrackingSessionRepository trackingSessionRepository
    ) {
        this.userRepository = userRepository;
        this.emergencyUtils = emergencyUtils;
        this.emergencyRepository = emergencyRepository;
        this.emergencyContactRepository = emergencyContactRepository;
        this.notificationService = notificationService;
        this.securityUtils = securityUtils;
        this.breachEventRepository = breachEventRepository;
        this.trackingSessionRepository = trackingSessionRepository;
    }

    public void handleMedicalEmergency(EmergencyEvent event){

        User user = userRepository.findById(event.getUserId())
                .orElseThrow(() ->
                        new UserNotFoundException("User Not Found"));

        List<EmergencyContact> contacts =
                emergencyUtils.getEmergencyContacts(user);

        for (EmergencyContact contact : contacts) {

            if(contact.getLinkedUser() != null){
                notificationService.sendEmergencyAlert(
                        contact.getLinkedUser(),
                        event
                );
            } else {
                log.info("Fallback contact number: {}", contact.getContactNumber());
            }
        }
    }

    public EmergencyEvent updateLiveLocation(
            UUID eventId,
            Double latitude,
            Double longitude
    ){



        EmergencyEvent event = emergencyRepository.findById(eventId)
                .orElseThrow(() ->
                        new EmergencyNotFoundException("Emergency Event Not Found"));

        if(event.getEmergencyStatus() != EmergencyStatus.ACTIVE){
            throw new IllegalArgumentException("Emergency is not active");
        }

        User requester = securityUtils.getCurrentUser();

        if (!event.getUserId().equals(requester.getUserId())) {
            throw new UnauthorizedAccessException(
                    "You cannot update another user's location"
            );
        }

        System.out.println(
                "LOCATION UPDATE RECEIVED: " +
                        latitude + "," + longitude
        );

        if(!emergencyUtils.isValidLocation(latitude,longitude)){
            throw new IllegalArgumentException("Invalid Coordinates");
        }
            event.setLatitude(latitude);
            event.setLongitude(longitude);

        return emergencyRepository.save(event);
    }



    public EmergencyEvent fetchLiveLocation(UUID eventId){

        EmergencyEvent event = emergencyRepository.findById(eventId)
                .orElseThrow(() ->
                        new EmergencyNotFoundException("Emergency Event Not Found"));

        // Emergency must still be active
        if(event.getEmergencyStatus() != EmergencyStatus.ACTIVE){
            throw new UnauthorizedAccessException(
                    "Emergency is not active"
            );
        }

        User requester = securityUtils.getCurrentUser();

        User owner = userRepository.findById(event.getUserId())
                .orElseThrow(() ->
                        new UserNotFoundException("Emergency Owner Not Found"));

        boolean authorized =
                owner.getUserId().equals(requester.getUserId())
                        ||
                        emergencyContactRepository.existsByOwnerUserAndLinkedUser(
                                owner,
                                requester
                        );

        System.out.println("EVENT ID = " + eventId);

        System.out.println("EVENT STATUS = " + event.getEmergencyStatus());

        System.out.println("EVENT OWNER = " + event.getUserId());

        System.out.println("REQUESTER = " + requester.getUserId());

        System.out.println("AUTHORIZED = " + authorized);

        if(!authorized){
            throw new UnauthorizedAccessException(
                    "Unauthorized Access"
            );
        }

        return event;
    }

    //ghost services
    @org.springframework.transaction.annotation.Transactional
    public LiveLocationResponse getLiveLocationInfo(UUID eventId) {
        // 1. Attempt existing EmergencyEvent lookup
        java.util.Optional<EmergencyEvent> emergencyOpt = emergencyRepository.findById(eventId);
        if (emergencyOpt.isPresent()) {
            EmergencyEvent event = emergencyOpt.get();
            if (event.getEmergencyStatus() != com.CareWave.carewave_backend.enums.EmergencyStatus.ACTIVE) {
                throw new UnauthorizedAccessException("Emergency is not active");
            }
            User requester = securityUtils.getCurrentUser();
            User owner = userRepository.findById(event.getUserId())
                    .orElseThrow(() -> new UserNotFoundException("Emergency Owner Not Found"));
            boolean authorized = owner.getUserId().equals(requester.getUserId())
                    || emergencyContactRepository.existsByOwnerUserAndLinkedUser(owner, requester);
            if (!authorized) {
                throw new UnauthorizedAccessException("Unauthorized Access");
            }
            LiveLocationResponse res = new LiveLocationResponse();
            res.setLatitude(event.getLatitude());
            res.setLongitude(event.getLongitude());
            return res;
        }

        // 2. Lookup an active LiveTrackingSession (real tracking session identifier)
        java.util.Optional<LiveTrackingSession> sessionOpt = trackingSessionRepository.findById(eventId);
        if (sessionOpt.isPresent()) {
            LiveTrackingSession session = sessionOpt.get();
            if (!Boolean.TRUE.equals(session.getActive()) || session.getExpiresAt().isBefore(LocalDateTime.now())) {
                throw new UnauthorizedAccessException("Tracking session is not active");
            }
            User requester = securityUtils.getCurrentUser();
            boolean authorized = session.getGuardianUser().getUserId().equals(requester.getUserId())
                    || session.getProtectedUser().getUserId().equals(requester.getUserId());
            if (!authorized) {
                throw new UnauthorizedAccessException("Unauthorized Access");
            }
            User protectedUser = session.getProtectedUser();
            LiveLocationResponse res = new LiveLocationResponse();
            res.setLatitude(protectedUser.getCurrentLatitude());
            res.setLongitude(protectedUser.getCurrentLongitude());
            return res;
        }

        // 3. Lookup an active GeoFence BreachEvent (fallback in case ID is breachEventId)
        java.util.Optional<BreachEvent> breachOpt = breachEventRepository.findById(eventId);
        if (breachOpt.isPresent()) {
            BreachEvent breach = breachOpt.get();
            if (breach.getAlertStatus() != AlertStatus.ACTIVE) {
                throw new UnauthorizedAccessException("Breach is not active");
            }
            User requester = securityUtils.getCurrentUser();
            boolean authorized = breach.getProtectedUser().getUserId().equals(requester.getUserId())
                    || emergencyContactRepository.existsByOwnerUserAndLinkedUser(breach.getProtectedUser(), requester);
            if (!authorized) {
                throw new UnauthorizedAccessException("Unauthorized Access");
            }
            User protectedUser = breach.getProtectedUser();
            LiveLocationResponse res = new LiveLocationResponse();
            res.setLatitude(protectedUser.getCurrentLatitude());
            res.setLongitude(protectedUser.getCurrentLongitude());
            return res;
        }

        throw new EmergencyNotFoundException("Active tracking session or emergency event not found");
    }
}