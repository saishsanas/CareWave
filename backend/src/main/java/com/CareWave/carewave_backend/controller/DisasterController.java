package com.CareWave.carewave_backend.controller;

import com.CareWave.carewave_backend.dto.RecentDisasterResponse;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.security.SecurityUtils;
import com.CareWave.carewave_backend.service.DisasterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/disasters")
public class DisasterController {

    private final DisasterService disasterService;
    private final SecurityUtils securityUtils;

    public DisasterController(
            DisasterService disasterService,
            SecurityUtils securityUtils
    ) {
        this.disasterService = disasterService;
        this.securityUtils = securityUtils;
    }

    @GetMapping("/recent")
    public ResponseEntity<List<RecentDisasterResponse>> getRecentDisasters() {
        User currentUser = securityUtils.getCurrentUser();
        List<RecentDisasterResponse> responses = disasterService.getRecentDisasters(currentUser);
        return ResponseEntity.ok(responses);
    }
}
