package com.CareWave.carewave_backend.dto;

import com.CareWave.carewave_backend.enums.EmergencyStatus;
import com.CareWave.carewave_backend.enums.EmergencyType;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class EmergencyResponse {

    private UUID emergencyId;

    private EmergencyStatus emergencyStatus;

    private EmergencyType emergencyType;

    private java.time.LocalDateTime createdAt;

    private UUID userId;

    private String victimName;

    private String victimPhone;
}