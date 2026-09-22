package com.CareWave.carewave_backend.controller;

import com.CareWave.carewave_backend.dto.AlertResponse;
import com.CareWave.carewave_backend.service.AlertService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/alerts")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping("/history")
    public ResponseEntity<List<AlertResponse>> getAlertsHistory() {
        List<AlertResponse> history = alertService.getAlertsHistory();
        return ResponseEntity.ok(history);
    }
}
