package com.CareWave.carewave_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@Table(name = "live_tracking_sessions", indexes = {
    @Index(name = "idx_session_user_guardian_active", columnList = "protected_user_id, guardian_user_id, active")
})
public class LiveTrackingSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID sessionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guardian_user_id", nullable = false)
    private User guardianUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "protected_user_id", nullable = false)
    private User protectedUser;

    @Column(nullable = false)
    private String triggeredByEventType;

    @Column(nullable = false)
    private LocalDateTime startedAt = LocalDateTime.now();

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private Boolean active = true;

    private LocalDateTime resolvedAt;

    private LocalDateTime cancelledAt;

    @Column(nullable = false)
    private Boolean autoExpired = false;

    @Column(nullable = false)
    private LocalDateTime lastAccessedAt = LocalDateTime.now();
}
