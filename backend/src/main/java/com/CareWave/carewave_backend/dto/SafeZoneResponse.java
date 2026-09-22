package com.CareWave.carewave_backend.dto;

import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
public class SafeZoneResponse {
    private UUID safeZoneId;
    private UUID guardianUserId;
    private UUID protectedUserId;
    private String protectedUserName;
    private Double centerLatitude;
    private Double centerLongitude;
    private Double radiusMeters;
    private String zoneName;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
