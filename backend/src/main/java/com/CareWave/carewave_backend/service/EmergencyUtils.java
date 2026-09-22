package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.entity.EmergencyContact;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.repository.EmergencyContactRepository;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class EmergencyUtils {

    private final EmergencyContactRepository emergencyContactRepository;

    public EmergencyUtils(EmergencyContactRepository emergencyContactRepository) {
        this.emergencyContactRepository = emergencyContactRepository;
    }

    public List<EmergencyContact> getEmergencyContacts(User user) {
        return emergencyContactRepository.findByOwnerUser(user);
    }

    public boolean isValidLocation(Double latitude, Double longitude){
        return latitude != null && longitude != null
                && latitude >= -90 && latitude <= 90
                && longitude >= -180 && longitude <= 180;
    }
}
