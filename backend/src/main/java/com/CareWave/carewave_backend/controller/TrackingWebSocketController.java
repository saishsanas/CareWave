package com.CareWave.carewave_backend.controller;

import com.CareWave.carewave_backend.dto.LiveLocationResponse;
import com.CareWave.carewave_backend.dto.UpdateUserLocationRequest;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.repository.UserRepository;
import com.CareWave.carewave_backend.service.UserLocationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class TrackingWebSocketController {

    private static final Logger log = LoggerFactory.getLogger(TrackingWebSocketController.class);

    private final UserLocationService userLocationService;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public TrackingWebSocketController(
            UserLocationService userLocationService,
            UserRepository userRepository,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.userLocationService = userLocationService;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/tracking.update")
    public void handleLocationUpdate(@Payload UpdateUserLocationRequest request, Principal principal) {
        if (principal == null) {
            log.warn("[WebSocket] Received location update from unauthenticated session");
            return;
        }
        try {
            userLocationService.updateUserLocation(request);

            String authIdentifier = principal.getName();
            User user = userRepository.findByEmail(authIdentifier)
                    .or(() -> userRepository.findByContactNumber(authIdentifier))
                    .orElse(null);

            if (user != null) {
                LiveLocationResponse response = new LiveLocationResponse();
                response.setLatitude(user.getCurrentLatitude());
                response.setLongitude(user.getCurrentLongitude());

                broadcastLocationUpdate(user.getUserId().toString(), response);
            }
        } catch (Exception e) {
            log.error("[WebSocket] Failed to process location update: {}", e.getMessage());
        }
    }

    public void broadcastLocationUpdate(String protectedUserId, LiveLocationResponse location) {
        messagingTemplate.convertAndSend("/topic/tracking/" + protectedUserId, location);
    }
}
