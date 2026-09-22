package com.CareWave.carewave_backend.entity;

import com.CareWave.carewave_backend.enums.BloodGroup;
import com.CareWave.carewave_backend.enums.Gender;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Table(name = "users", indexes = {
    @Index(name = "idx_user_fcm_token", columnList = "fcmToken"),
    @Index(name = "idx_user_last_location_updated_at", columnList = "lastLocationUpdatedAt")
})
@Entity
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID userId;

    @Column(nullable = false)
    private String firstName;

    private String lastName;

    @Enumerated(EnumType.STRING)
    private BloodGroup bloodGroup;

    @Column(nullable = false, unique = true)
    private String contactNumber;

    @Column(unique = true, nullable = false)
    private String email;

    private String fcmToken;

    private String password;

    @Enumerated(EnumType.STRING)
    private Gender gender;

    private Double currentLatitude;

    private Double currentLongitude;

    private java.time.LocalDateTime lastLocationUpdatedAt;

    private Boolean gpsEnabled;

    private Boolean currentlyOutsideSafeZone;

    private java.time.LocalDateTime liveTrackingEnabledUntil;

    private java.time.LocalDateTime pendingExitSince;

    private Double lastLatitude;

    private Double lastLongitude;
}

