package com.CareWave.carewave_backend.dto;

import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
public class TrackingStatusResponse {
    private UUID sessionId;
    private UUID protectedUserId;
    private String protectedUserName;
    private Boolean trackingActive;
    private String triggeredByEventType;
    private LocalDateTime expiresAt;
    private Double currentLatitude;
    private Double currentLongitude;
    private LocalDateTime lastLocationUpdatedAt;
    private Boolean gpsEnabled;
    private String freshnessStatus;
}
