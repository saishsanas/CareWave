package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.dto.CreateSafeZoneRequest;
import com.CareWave.carewave_backend.dto.SafeZoneResponse;
import com.CareWave.carewave_backend.dto.UpdateSafeZoneRequest;
import com.CareWave.carewave_backend.entity.SafeZone;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.exception.SafeZoneNotFoundException;
import com.CareWave.carewave_backend.exception.UserNotFoundException;
import com.CareWave.carewave_backend.exception.UnauthorizedAccessException;
import com.CareWave.carewave_backend.repository.EmergencyContactRepository;
import com.CareWave.carewave_backend.repository.SafeZoneRepository;
import com.CareWave.carewave_backend.repository.UserRepository;
import com.CareWave.carewave_backend.security.SecurityUtils;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class SafeZoneService {

    private final SafeZoneRepository safeZoneRepository;
    private final UserRepository userRepository;
    private final EmergencyContactRepository emergencyContactRepository;
    private final SecurityUtils securityUtils;

    public SafeZoneService(
            SafeZoneRepository safeZoneRepository,
            UserRepository userRepository,
            EmergencyContactRepository emergencyContactRepository,
            SecurityUtils securityUtils
    ) {
        this.safeZoneRepository = safeZoneRepository;
        this.userRepository = userRepository;
        this.emergencyContactRepository = emergencyContactRepository;
        this.securityUtils = securityUtils;
    }

    public SafeZoneResponse createSafeZone(CreateSafeZoneRequest request) {
        User guardian = securityUtils.getCurrentUser();

        User protectedUser = userRepository.findById(request.getProtectedUserId())
                .orElseThrow(() -> new UserNotFoundException("Protected user not found"));

        // Strict Authorization Check: Guardian must be linked as contact for protected user
        boolean isLinked = emergencyContactRepository.existsByOwnerUserAndLinkedUser(protectedUser, guardian);
        if (!isLinked) {
            throw new UnauthorizedAccessException("You are not authorized to create safe zones for this user");
        }

        SafeZone safeZone = new SafeZone();
        safeZone.setGuardianUser(guardian);
        safeZone.setProtectedUser(protectedUser);
        safeZone.setCenterLatitude(request.getCenterLatitude());
        safeZone.setCenterLongitude(request.getCenterLongitude());
        safeZone.setRadiusMeters(request.getRadiusMeters());
        safeZone.setZoneName(request.getZoneName());
        safeZone.setActive(true);
        safeZone.setCreatedAt(LocalDateTime.now());
        safeZone.setUpdatedAt(LocalDateTime.now());

        SafeZone saved = safeZoneRepository.save(safeZone);
        return mapToResponse(saved);
    }

    public SafeZoneResponse updateSafeZone(UUID safeZoneId, UpdateSafeZoneRequest request) {
        User guardian = securityUtils.getCurrentUser();

        SafeZone safeZone = safeZoneRepository.findById(safeZoneId)
                .orElseThrow(() -> new SafeZoneNotFoundException("Safe zone not found"));

        // Guardian check
        if (!safeZone.getGuardianUser().getUserId().equals(guardian.getUserId())) {
            throw new UnauthorizedAccessException("You are not authorized to modify this safe zone");
        }

        if (request.getCenterLatitude() != null) {
            safeZone.setCenterLatitude(request.getCenterLatitude());
        }
        if (request.getCenterLongitude() != null) {
            safeZone.setCenterLongitude(request.getCenterLongitude());
        }
        if (request.getRadiusMeters() != null) {
            safeZone.setRadiusMeters(request.getRadiusMeters());
        }
        if (request.getZoneName() != null) {
            safeZone.setZoneName(request.getZoneName());
        }
        if (request.getActive() != null) {
            safeZone.setActive(request.getActive());
        }
        safeZone.setUpdatedAt(LocalDateTime.now());

        SafeZone saved = safeZoneRepository.save(safeZone);
        return mapToResponse(saved);
    }

    public void deleteSafeZone(UUID safeZoneId) {
        User guardian = securityUtils.getCurrentUser();

        SafeZone safeZone = safeZoneRepository.findById(safeZoneId)
                .orElseThrow(() -> new SafeZoneNotFoundException("Safe zone not found"));

        if (!safeZone.getGuardianUser().getUserId().equals(guardian.getUserId())) {
            throw new UnauthorizedAccessException("You are not authorized to delete this safe zone");
        }

        safeZoneRepository.delete(safeZone);
    }

    public List<SafeZoneResponse> getSafeZones() {
        User user = securityUtils.getCurrentUser();
        // Get safe zones where current user is guardian or protected user
        List<SafeZone> zones = new ArrayList<>();
        zones.addAll(safeZoneRepository.findByGuardianUser(user));
        zones.addAll(safeZoneRepository.findByProtectedUser(user));

        return zones.stream()
                .distinct()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private SafeZoneResponse mapToResponse(SafeZone zone) {
        SafeZoneResponse res = new SafeZoneResponse();
        res.setSafeZoneId(zone.getSafeZoneId());
        res.setGuardianUserId(zone.getGuardianUser().getUserId());
        res.setProtectedUserId(zone.getProtectedUser().getUserId());
        res.setProtectedUserName(zone.getProtectedUser().getFirstName() + " " + zone.getProtectedUser().getLastName());
        res.setCenterLatitude(zone.getCenterLatitude());
        res.setCenterLongitude(zone.getCenterLongitude());
        res.setRadiusMeters(zone.getRadiusMeters());
        res.setZoneName(zone.getZoneName());
        res.setActive(zone.getActive());
        res.setCreatedAt(zone.getCreatedAt());
        res.setUpdatedAt(zone.getUpdatedAt());
        return res;
    }
}
