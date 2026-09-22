package com.CareWave.carewave_backend.dto;

import com.CareWave.carewave_backend.enums.BloodGroup;
import com.CareWave.carewave_backend.enums.Gender;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileDto {
    private String firstName;
    private String lastName;
    private String email;
    private Gender gender;
    private BloodGroup bloodGroup;
    private String contactNumber;
}
