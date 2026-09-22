package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.dto.UserProfileDto;
import com.CareWave.carewave_backend.dto.UserProfileStatsDto;
import com.CareWave.carewave_backend.entity.BreachEvent;
import com.CareWave.carewave_backend.entity.EmergencyEvent;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.repository.*;
import com.CareWave.carewave_backend.security.SecurityUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final EmergencyContactRepository emergencyContactRepository;
    private final SafeZoneRepository safeZoneRepository;
    private final EmergencyRepository emergencyRepository;
    private final BreachEventRepository breachEventRepository;
    private final SecurityUtils securityUtils;

    public ProfileService(
            UserRepository userRepository,
            EmergencyContactRepository emergencyContactRepository,
            SafeZoneRepository safeZoneRepository,
            EmergencyRepository emergencyRepository,
            BreachEventRepository breachEventRepository,
            SecurityUtils securityUtils
    ) {
        this.userRepository = userRepository;
        this.emergencyContactRepository = emergencyContactRepository;
        this.safeZoneRepository = safeZoneRepository;
        this.emergencyRepository = emergencyRepository;
        this.breachEventRepository = breachEventRepository;
        this.securityUtils = securityUtils;
    }

    @Transactional(readOnly = true)
    public UserProfileDto getProfile() {
        User user = securityUtils.getCurrentUser();
        return mapToDto(user);
    }

    @Transactional
    public UserProfileDto updateProfile(UserProfileDto dto) {
        User user = securityUtils.getCurrentUser();
        
        if (dto.getFirstName() != null && !dto.getFirstName().trim().isEmpty()) {
            user.setFirstName(dto.getFirstName().trim());
        }
        if (dto.getGender() != null) {
            user.setGender(dto.getGender());
        }
        if (dto.getBloodGroup() != null) {
            user.setBloodGroup(dto.getBloodGroup());
        }

        User savedUser = userRepository.save(user);
        return mapToDto(savedUser);
    }

    @Transactional(readOnly = true)
    public UserProfileStatsDto getProfileStats() {
        User user = securityUtils.getCurrentUser();
        UUID userId = user.getUserId();

        long contactsCount = emergencyContactRepository.findByOwnerUser(user).size();
        long safeZonesCount = safeZoneRepository.findByGuardianUser(user).size();

        List<EmergencyEvent> emergencies = emergencyRepository.findMyAndParticipatingEmergencies(userId);
        List<BreachEvent> breaches = breachEventRepository.findMyAndParticipatingBreaches(userId);

        long createdCount = 0;
        long monitoringCount = 0;

        for (EmergencyEvent e : emergencies) {
            if (e.getUserId().equals(userId)) {
                createdCount++;
            } else {
                monitoringCount++;
            }
        }

        for (BreachEvent b : breaches) {
            if (b.getProtectedUser() != null && b.getProtectedUser().getUserId().equals(userId)) {
                createdCount++;
            } else {
                monitoringCount++;
            }
        }

        return UserProfileStatsDto.builder()
                .emergencyContactsCount(contactsCount)
                .safeZonesCount(safeZonesCount)
                .alertsCreatedCount(createdCount)
                .alertsMonitoringCount(monitoringCount)
                .build();
    }

    private UserProfileDto mapToDto(User user) {
        return UserProfileDto.builder()
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .gender(user.getGender())
                .bloodGroup(user.getBloodGroup())
                .contactNumber(user.getContactNumber())
                .build();
    }
}
