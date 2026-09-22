package com.CareWave.carewave_backend.repository;

import com.CareWave.carewave_backend.entity.EmergencyContact;
import com.CareWave.carewave_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EmergencyContactRepository extends JpaRepository<EmergencyContact, UUID> {
    List<EmergencyContact> findByOwnerUser(User ownerUser);

    boolean existsByOwnerUserAndLinkedUser(
            User ownerUser,
            User linkedUser
    );

}