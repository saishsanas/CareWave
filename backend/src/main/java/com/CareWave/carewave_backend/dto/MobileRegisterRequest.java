package com.CareWave.carewave_backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MobileRegisterRequest {
    private String firstName;
    private String contactNumber;
    private String bloodGroup;
    private String gender;
    private String fcmToken;
    private String email;

}
