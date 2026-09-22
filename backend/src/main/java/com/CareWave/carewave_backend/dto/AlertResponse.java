package com.CareWave.carewave_backend.dto;

import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
public class AlertResponse {
    private String alertId;
    private String alertType;
    private String status;
    private String relationship;
    private String ownerName;
    private LocalDateTime createdAt;
    private Double latitude;
    private Double longitude;
    private String trackingSessionId;
    private String alertSourceUserId;
    private String alertSourceUserName;
}
