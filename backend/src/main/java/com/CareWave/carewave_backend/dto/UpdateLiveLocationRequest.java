package com.CareWave.carewave_backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class UpdateLiveLocationRequest {

    private UUID eventId;
    private Double latitude;
    private Double longitude;
}