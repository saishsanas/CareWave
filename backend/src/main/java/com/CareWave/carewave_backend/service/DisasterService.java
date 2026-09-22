package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.dto.RecentDisasterResponse;
import com.CareWave.carewave_backend.entity.DisasterEvent;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.repository.DisasterEventRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class DisasterService {

    private final DisasterEventRepository disasterEventRepository;
    private final GeoFencingService geoFencingService;

    public DisasterService(
            DisasterEventRepository disasterEventRepository,
            GeoFencingService geoFencingService
    ) {
        this.disasterEventRepository = disasterEventRepository;
        this.geoFencingService = geoFencingService;
    }

    public List<RecentDisasterResponse> getRecentDisasters(User user) {
        // Fetch the 20 most recent disaster events to guarantee demo visibility
        List<DisasterEvent> events = disasterEventRepository.findTop20ByOrderByOccurredAtDesc();
        List<RecentDisasterResponse> responses = new ArrayList<>();

        for (DisasterEvent event : events) {
            Double distanceKm = null;
            boolean affectedForUser = false;

            if (user.getLastLatitude() != null && user.getLastLongitude() != null) {
                double distanceMeters = geoFencingService.calculateDistanceMeters(
                        user.getLastLatitude(),
                        user.getLastLongitude(),
                        event.getLatitude(),
                        event.getLongitude()
                );
                distanceKm = distanceMeters / 1000.0;
                
                // User is affected if their last known location is within the warning radius
                if (distanceKm <= event.getRadiusKm()) {
                    affectedForUser = true;
                }
            }

            RecentDisasterResponse response = new RecentDisasterResponse();
            response.setDisasterType(event.getDisasterType());
            response.setSeverity(event.getSeverity());
            response.setDistanceKm(distanceKm);
            response.setWarningRadiusKm(event.getRadiusKm());
            response.setAffectedForUser(affectedForUser);
            response.setOccurredAt(event.getOccurredAt());
            response.setStatus(event.getActive() ? "ACTIVE" : "RESOLVED");
            response.setLocationName(event.getLocationName());
            responses.add(response);
        }

        // Sort by affectedForUser descending (true first) and occurredAt descending (newest first)
        responses.sort((r1, r2) -> {
            if (r1.isAffectedForUser() != r2.isAffectedForUser()) {
                return r1.isAffectedForUser() ? -1 : 1;
            }
            return r2.getOccurredAt().compareTo(r1.getOccurredAt());
        });

        return responses;
    }
}
