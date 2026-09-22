package com.CareWave.carewave_backend.dto;

import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
public class CancelAlertResponse {
    private UUID breachEventId;
    private String alertStatus;
    private LocalDateTime processedAt;
    private String message;
}
