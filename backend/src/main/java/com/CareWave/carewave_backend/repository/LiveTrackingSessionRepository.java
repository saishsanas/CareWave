package com.CareWave.carewave_backend.repository;

import com.CareWave.carewave_backend.entity.LiveTrackingSession;
import com.CareWave.carewave_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface LiveTrackingSessionRepository extends JpaRepository<LiveTrackingSession, UUID> {
    Optional<LiveTrackingSession> findByProtectedUserAndActiveTrue(User protectedUser);
    java.util.List<LiveTrackingSession> findAllByProtectedUserAndActiveTrue(User protectedUser);
    Optional<LiveTrackingSession> findByProtectedUserAndGuardianUserAndActiveTrue(User protectedUser, User guardianUser);

    @org.springframework.data.jpa.repository.Query("SELECT s FROM LiveTrackingSession s WHERE s.active = true AND s.expiresAt < :now")
    java.util.List<LiveTrackingSession> findExpiredActiveSessions(@org.springframework.data.repository.query.Param("now") java.time.LocalDateTime now);
}

