package com.CareWave.carewave_backend.dto;

import lombok.Getter;
import lombok.Setter;
import java.util.UUID;

@Getter
@Setter
public class RegisterResponse {
    private UUID userId;
    private String firstName;
    private String lastName;
    private String email;
    private String message;
}
