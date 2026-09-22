package com.CareWave.carewave_backend.controller;

import com.CareWave.carewave_backend.dto.EmergencyRequest;
import com.CareWave.carewave_backend.dto.EmergencyResponse;
import com.CareWave.carewave_backend.entity.EmergencyEvent;
import com.CareWave.carewave_backend.service.EmergencyService;
import com.CareWave.carewave_backend.security.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.CareWave.carewave_backend.repository.UserRepository;

@RestController
@RequestMapping("/emergency")
public class EmergencyController {

    private final EmergencyService emergencyService;
    private final SecurityUtils securityUtils;
    private final UserRepository userRepository;

    public EmergencyController(
            EmergencyService emergencyService,
            SecurityUtils securityUtils,
            UserRepository userRepository
    ) {
        this.emergencyService = emergencyService;
        this.securityUtils = securityUtils;
        this.userRepository = userRepository;
    }

    @GetMapping("/active")
    public ResponseEntity<EmergencyResponse> getActiveEmergency() {
        com.CareWave.carewave_backend.entity.User user = securityUtils.getCurrentUser();
        java.util.Optional<EmergencyEvent> activeEmergency = emergencyService.getActiveEmergency(user.getUserId());

        if (activeEmergency.isPresent()) {
            EmergencyEvent event = activeEmergency.get();
            EmergencyResponse response = new EmergencyResponse();
            response.setEmergencyId(event.getEmergencyId());
            response.setEmergencyStatus(event.getEmergencyStatus());
            response.setEmergencyType(event.getEmergencyType());
            response.setCreatedAt(event.getCreatedAt());
            response.setUserId(event.getUserId());

            // Populate victim's full name and phone number
            userRepository.findById(event.getUserId()).ifPresent(victim -> {
                String fullName = victim.getFirstName() + (victim.getLastName() != null ? " " + victim.getLastName() : "");
                response.setVictimName(fullName);
                response.setVictimPhone(victim.getContactNumber());
            });

            return ResponseEntity.ok(response);
        }

        return ResponseEntity.ok(null);
    }

    @PostMapping("/{emergencyId}/acknowledge")
    public ResponseEntity<Void> acknowledgeEmergency(
            @PathVariable java.util.UUID emergencyId
    ) {
        emergencyService.sendAcknowledgementNotification(emergencyId);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/cancel")
    public ResponseEntity<EmergencyResponse> cancelEmergency(
            @jakarta.validation.Valid @RequestBody com.CareWave.carewave_backend.dto.EmergencyCancelRequest request
    ) {
        EmergencyEvent event = emergencyService.cancelEmergency(request.getEmergencyId());
        EmergencyResponse response = new EmergencyResponse();
        response.setEmergencyId(event.getEmergencyId());
        response.setEmergencyStatus(event.getEmergencyStatus());
        response.setEmergencyType(event.getEmergencyType());
        response.setCreatedAt(event.getCreatedAt());
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/resolve")
    public ResponseEntity<EmergencyResponse> resolveEmergency(
            @jakarta.validation.Valid @RequestBody com.CareWave.carewave_backend.dto.EmergencyCancelRequest request
    ) {
        EmergencyEvent event = emergencyService.resolveEmergency(request.getEmergencyId());
        EmergencyResponse response = new EmergencyResponse();
        response.setEmergencyId(event.getEmergencyId());
        response.setEmergencyStatus(event.getEmergencyStatus());
        response.setEmergencyType(event.getEmergencyType());
        response.setCreatedAt(event.getCreatedAt());
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<EmergencyResponse>
    createEmergencyEvent(
            @RequestBody EmergencyRequest request
    ){

        EmergencyEvent event =
                emergencyService
                        .createEmergencyEvent(request);

        EmergencyResponse response =
                new EmergencyResponse();

        response.setEmergencyId(
                event.getEmergencyId()
        );

        response.setEmergencyStatus(
                event.getEmergencyStatus()
        );

        response.setEmergencyType(
                event.getEmergencyType()
        );
        response.setCreatedAt(
                event.getCreatedAt()
        );

        response.setUserId(event.getUserId());

        return ResponseEntity.ok(response);
    }
}