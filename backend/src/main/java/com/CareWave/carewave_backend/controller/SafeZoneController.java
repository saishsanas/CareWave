package com.CareWave.carewave_backend.controller;

import com.CareWave.carewave_backend.dto.CreateSafeZoneRequest;
import com.CareWave.carewave_backend.dto.SafeZoneResponse;
import com.CareWave.carewave_backend.dto.UpdateSafeZoneRequest;
import com.CareWave.carewave_backend.service.SafeZoneService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/safe-zones")
public class SafeZoneController {

    private final SafeZoneService safeZoneService;

    public SafeZoneController(SafeZoneService safeZoneService) {
        this.safeZoneService = safeZoneService;
    }

    @PostMapping
    public ResponseEntity<SafeZoneResponse> createSafeZone(
            @Valid @RequestBody CreateSafeZoneRequest request
    ) {
        SafeZoneResponse response = safeZoneService.createSafeZone(request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<SafeZoneResponse> updateSafeZone(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateSafeZoneRequest request
    ) {
        SafeZoneResponse response = safeZoneService.updateSafeZone(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSafeZone(
            @PathVariable UUID id
    ) {
        safeZoneService.deleteSafeZone(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<SafeZoneResponse>> getSafeZones() {
        List<SafeZoneResponse> response = safeZoneService.getSafeZones();
        return ResponseEntity.ok(response);
    }
}
