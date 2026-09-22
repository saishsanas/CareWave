package com.CareWave.carewave_backend.entity;

import com.CareWave.carewave_backend.enums.EmergencyStatus;
import com.CareWave.carewave_backend.enums.EmergencyType;
import com.CareWave.carewave_backend.enums.FireSeverity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Table(name = "emergency_events", indexes = {
    @Index(name = "idx_emergency_user_status", columnList = "userId, emergencyStatus")
})
@Entity
public class EmergencyEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID emergencyId;

    @Column(nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EmergencyStatus emergencyStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EmergencyType emergencyType;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime lastLocationUpdatedAt;

    private LocalDateTime resolvedAt;

    private LocalDateTime activatedAt;

    private Double latitude;
    private Double  longitude;

    @Enumerated(EnumType.STRING)
    private FireSeverity fireSeverity;

    private String evacuationMessage;

    private Double emergencyRadiusKm;

    @PrePersist
    public void onCreate(){
        this.createdAt= LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate(){
        this.lastLocationUpdatedAt = LocalDateTime.now();
    }
}
