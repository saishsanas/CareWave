package com.CareWave.carewave_backend.repository;

import com.CareWave.carewave_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE u.lastLocationUpdatedAt < :threshold AND u.lastLocationUpdatedAt IS NOT NULL")
    java.util.List<User> findUsersOffline(@org.springframework.data.repository.query.Param("threshold") java.time.LocalDateTime threshold);

    @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE u.lastLatitude IS NOT NULL AND u.lastLongitude IS NOT NULL AND u.lastLocationUpdatedAt >= :threshold")
    java.util.List<User> findActiveUsersForDisaster(@org.springframework.data.repository.query.Param("threshold") java.time.LocalDateTime threshold);

    boolean existsByContactNumber(String contactNumber);

    java.util.Optional<User> findByContactNumber(String contactNumber);
}


