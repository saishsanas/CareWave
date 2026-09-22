package com.CareWave.carewave_backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import java.util.UUID;

@Getter
@Setter
public class CancelAlertRequest {
    @NotNull(message = "Breach event ID is required")
    private UUID breachEventId;
}
