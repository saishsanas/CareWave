package com.CareWave.carewave_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@Table(name = "disaster_events")
public class DisasterEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID disasterEventId;

    @Column(nullable = false, unique = true)
    private String externalEventId;

    @Column(nullable = false)
    private String disasterType;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(nullable = false)
    private Double magnitude = 0.0;

    @Column(name = "radius_km", nullable = false)
    private Double radiusKm;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    private String locationName;

    @Column(nullable = false)
    private String severity;

    @Column(nullable = false)
    private LocalDateTime occurredAt;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
