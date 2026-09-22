package com.CareWave.carewave_backend.entity;

import com.CareWave.carewave_backend.enums.AlertStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@Table(name = "breach_events", indexes = {
    @Index(name = "idx_breach_protected_user_status", columnList = "protected_user_id, alertStatus")
})
public class BreachEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID breachEventId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "protected_user_id", nullable = false)
    private User protectedUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "safe_zone_id")
    private SafeZone safeZone;

    @Column(nullable = false)
    private String eventType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertStatus alertStatus = AlertStatus.ACTIVE;

    @Column(nullable = false)
    private LocalDateTime occurredAt = LocalDateTime.now();

    private LocalDateTime resolvedAt;

    private LocalDateTime cancelledAt;

    private String resolvedOrCancelledBy;

    @Column(nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
}
