package com.CareWave.carewave_backend.repository;

import com.CareWave.carewave_backend.entity.DisasterEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface DisasterEventRepository extends JpaRepository<DisasterEvent, UUID> {

    boolean existsByExternalEventId(String externalEventId);

    java.util.List<DisasterEvent> findTop20ByOrderByOccurredAtDesc();

    java.util.List<DisasterEvent> findByDisasterTypeAndExpiresAtAfter(String disasterType, java.time.LocalDateTime time);
}
