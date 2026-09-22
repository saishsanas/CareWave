package com.CareWave.carewave_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateEmergencyContactRequest {

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Contact number is required")
    @Pattern(regexp = "^(?:\\+91)?[6-9]\\d{9}$", message = "Contact number must be a valid 10-digit Indian mobile number, optionally prefixed with +91")
    private String contactNumber;

    @NotBlank(message = "Relation is required")
    private String relation;
}
