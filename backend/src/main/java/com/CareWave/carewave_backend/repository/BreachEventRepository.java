package com.CareWave.carewave_backend.repository;

import com.CareWave.carewave_backend.entity.BreachEvent;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.enums.AlertStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BreachEventRepository extends JpaRepository<BreachEvent, UUID> {
    List<BreachEvent> findByProtectedUserAndAlertStatus(User protectedUser, AlertStatus status);
    Optional<BreachEvent> findFirstByProtectedUserAndAlertStatusOrderByOccurredAtDesc(User protectedUser, AlertStatus status);

    @org.springframework.data.jpa.repository.Query("SELECT e FROM BreachEvent e WHERE e.alertStatus = com.CareWave.carewave_backend.enums.AlertStatus.ACTIVE AND e.occurredAt < :threshold")
    java.util.List<BreachEvent> findActiveBreachesOlderThan(@org.springframework.data.repository.query.Param("threshold") java.time.LocalDateTime threshold);

    @org.springframework.data.jpa.repository.Query(
        "SELECT DISTINCT b FROM BreachEvent b " +
        "LEFT JOIN b.safeZone sz " +
        "WHERE b.protectedUser.userId = :userId " +
        "OR sz.guardianUser.userId = :userId " +
        "OR b.protectedUser.userId IN (SELECT c.ownerUser.userId FROM EmergencyContact c WHERE c.linkedUser IS NOT NULL AND c.linkedUser.userId = :userId) " +
        "OR b.protectedUser.userId IN (SELECT s.protectedUser.userId FROM SafeZone s WHERE s.guardianUser.userId = :userId)"
    )
    List<BreachEvent> findMyAndParticipatingBreaches(@org.springframework.data.repository.query.Param("userId") UUID userId);
}

