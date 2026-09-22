package com.CareWave.carewave_backend.repository;

import com.CareWave.carewave_backend.entity.EmergencyEvent;
import com.CareWave.carewave_backend.entity.EmergencyContact;
import com.CareWave.carewave_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EmergencyRepository extends JpaRepository<EmergencyEvent, UUID> {

    List<EmergencyEvent> findByUserIdAndEmergencyStatus(UUID userId, com.CareWave.carewave_backend.enums.EmergencyStatus emergencyStatus);

    @org.springframework.data.jpa.repository.Query(
        "SELECT e FROM EmergencyEvent e WHERE e.userId = :userId " +
        "OR e.userId IN (SELECT c.ownerUser.userId FROM EmergencyContact c WHERE c.linkedUser IS NOT NULL AND c.linkedUser.userId = :userId)"
    )
    List<EmergencyEvent> findMyAndParticipatingEmergencies(@org.springframework.data.repository.query.Param("userId") UUID userId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT e FROM EmergencyEvent e WHERE e.emergencyStatus = :status AND " +
        "e.userId IN (SELECT c.ownerUser.userId FROM EmergencyContact c WHERE c.linkedUser IS NOT NULL AND c.linkedUser.userId = :userId)"
    )
    List<EmergencyEvent> findActiveParticipatingEmergencies(
        @org.springframework.data.repository.query.Param("userId") UUID userId,
        @org.springframework.data.repository.query.Param("status") com.CareWave.carewave_backend.enums.EmergencyStatus status
    );
}