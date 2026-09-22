package com.CareWave.carewave_backend.entity;

import com.CareWave.carewave_backend.enums.Relation;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Getter
@Setter
public class EmergencyContact {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID emergencyContactId;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String contactNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Relation relation;

    @ManyToOne
    private User ownerUser;

    @ManyToOne
    private User linkedUser;
}
