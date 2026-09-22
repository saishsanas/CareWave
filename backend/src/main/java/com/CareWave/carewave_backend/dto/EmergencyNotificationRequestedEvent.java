package com.CareWave.carewave_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyNotificationRequestedEvent implements Serializable {

    private UUID eventId;
    private UUID emergencyId;
    private UUID userId;
    private String emergencyType;
    private Double latitude;
    private Double longitude;
    private String timestamp;
}
