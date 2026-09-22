package com.CareWave.carewave_backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUserLocationRequest {
    private Double latitude;
    private Double longitude;

    @NotNull(message = "GPS enabled status is required")
    private Boolean gpsEnabled;
}
