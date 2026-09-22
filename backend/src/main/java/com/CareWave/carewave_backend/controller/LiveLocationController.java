package com.CareWave.carewave_backend.controller;

import com.CareWave.carewave_backend.dto.LiveLocationResponse;
import com.CareWave.carewave_backend.dto.UpdateLiveLocationRequest;
import com.CareWave.carewave_backend.entity.EmergencyEvent;
import com.CareWave.carewave_backend.service.MedicalEmergencyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/tracking")
public class LiveLocationController {

    private final MedicalEmergencyService medicalEmergencyService;

    public LiveLocationController(
            MedicalEmergencyService medicalEmergencyService
    ) {
        this.medicalEmergencyService = medicalEmergencyService;
    }

    @PatchMapping("/live-location")
    public ResponseEntity<Void> updateLiveLocation(
            @RequestBody UpdateLiveLocationRequest request
    ) {
        medicalEmergencyService.updateLiveLocation(
                request.getEventId(),
                request.getLatitude(),
                request.getLongitude()
        );

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/live-location")
    public ResponseEntity<LiveLocationResponse> fetchLiveLocation(
            @RequestParam UUID eventId
    ) {
        LiveLocationResponse response =
                medicalEmergencyService.getLiveLocationInfo(eventId);
        return ResponseEntity.ok(response);
    }
}