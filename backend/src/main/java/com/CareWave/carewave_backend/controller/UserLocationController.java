package com.CareWave.carewave_backend.controller;

import com.CareWave.carewave_backend.dto.EmergencyContactResponse;
import com.CareWave.carewave_backend.dto.TrackingStatusResponse;
import com.CareWave.carewave_backend.dto.UpdateUserLocationRequest;
import com.CareWave.carewave_backend.service.EmergencyContactService;
import com.CareWave.carewave_backend.service.UserLocationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/users")
public class UserLocationController {

    private final UserLocationService userLocationService;
    private final EmergencyContactService emergencyContactService;

    public UserLocationController(
            UserLocationService userLocationService,
            EmergencyContactService emergencyContactService
    ) {
        this.userLocationService = userLocationService;
        this.emergencyContactService = emergencyContactService;
    }

    @PatchMapping("/location")
    public ResponseEntity<Void> updateUserLocation(
            @Valid @RequestBody UpdateUserLocationRequest request
    ) {
        userLocationService.updateUserLocation(request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/location-status")
    public ResponseEntity<TrackingStatusResponse> getProtectedUserLocationStatus(
            @RequestParam UUID protectedUserId
    ) {
        TrackingStatusResponse response = userLocationService.getProtectedUserLocationStatus(protectedUserId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/contacts")
    public ResponseEntity<List<EmergencyContactResponse>> getEmergencyContacts() {
        List<EmergencyContactResponse> response = emergencyContactService.getEmergencyContactsForCurrentUser();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/contacts")
    public ResponseEntity<EmergencyContactResponse> createEmergencyContact(
            @Valid @RequestBody com.CareWave.carewave_backend.dto.CreateEmergencyContactRequest request
    ) {
        EmergencyContactResponse response = emergencyContactService.createEmergencyContactForCurrentUser(request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/contacts/{id}")
    public ResponseEntity<Void> deleteEmergencyContact(
            @PathVariable UUID id
    ) {
        emergencyContactService.deleteEmergencyContactForCurrentUser(id);
        return ResponseEntity.noContent().build();
    }
}
