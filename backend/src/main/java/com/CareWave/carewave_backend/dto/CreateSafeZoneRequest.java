package com.CareWave.carewave_backend.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import java.util.UUID;

@Getter
@Setter
public class CreateSafeZoneRequest {

    @NotNull(message = "Protected user ID is required")
    private UUID protectedUserId;

    @NotNull(message = "Center latitude is required")
    @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
    private Double centerLatitude;

    @NotNull(message = "Center longitude is required")
    @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
    private Double centerLongitude;

    @NotNull(message = "Radius in meters is required")
    @Min(value = 10, message = "Radius must be at least 10 meters")
    private Double radiusMeters;

    @NotBlank(message = "Zone name is required")
    private String zoneName;
}
