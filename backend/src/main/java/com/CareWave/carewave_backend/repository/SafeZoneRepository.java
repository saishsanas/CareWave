package com.CareWave.carewave_backend.repository;

import com.CareWave.carewave_backend.entity.SafeZone;
import com.CareWave.carewave_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface SafeZoneRepository extends JpaRepository<SafeZone, UUID> {
    List<SafeZone> findByGuardianUser(User guardianUser);
    List<SafeZone> findByProtectedUser(User protectedUser);
    List<SafeZone> findByProtectedUserAndActiveTrue(User protectedUser);
}
