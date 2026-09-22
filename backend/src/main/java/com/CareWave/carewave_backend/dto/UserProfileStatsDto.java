package com.CareWave.carewave_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileStatsDto {
    private long emergencyContactsCount;
    private long safeZonesCount;
    private long alertsCreatedCount;
    private long alertsMonitoringCount;
}
