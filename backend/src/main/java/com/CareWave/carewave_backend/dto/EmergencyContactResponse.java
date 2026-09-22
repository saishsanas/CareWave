package com.CareWave.carewave_backend.dto;

import lombok.Getter;
import lombok.Setter;
import java.util.UUID;

@Getter
@Setter
public class EmergencyContactResponse {
    private UUID contactId;
    private String fullName;
    private String contactNumber;
    private String relation;
    private UUID linkedUserId;
    private boolean linkedToRegisteredUser;
}
