package com.CareWave.carewave_backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MobileLoginRequest {
    private String contactNumber;
    private String fcmToken;
}
