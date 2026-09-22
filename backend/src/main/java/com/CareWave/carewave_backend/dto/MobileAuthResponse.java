package com.CareWave.carewave_backend.dto;

import lombok.Getter;
import lombok.Setter;
import java.util.UUID;

@Getter
@Setter
public class MobileAuthResponse {
    private String token;
    private UUID userId;
    private String firstName;
    private String contactNumber;
}
