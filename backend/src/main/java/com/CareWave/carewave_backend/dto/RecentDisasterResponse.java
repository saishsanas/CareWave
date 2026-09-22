package com.CareWave.carewave_backend.dto;

import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
public class RecentDisasterResponse {
    private String disasterType;
    private String severity;
    private Double distanceKm;
    private Double warningRadiusKm;
    private boolean affectedForUser;
    private LocalDateTime occurredAt;
    private String status;
    private String locationName;
}
