package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.entity.EmergencyContact;
import com.CareWave.carewave_backend.entity.EmergencyEvent;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.exception.UserNotFoundException;
import com.CareWave.carewave_backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FireEmergencyService {

    private static final Logger log = LoggerFactory.getLogger(FireEmergencyService.class);

    private final UserRepository userRepository;

    private final EmergencyUtils emergencyUtils;

    private final NotificationService notificationService;

    public FireEmergencyService(
            UserRepository userRepository,
            EmergencyUtils emergencyUtils,
            NotificationService notificationService
    ) {
        this.userRepository = userRepository;
        this.emergencyUtils = emergencyUtils;
        this.notificationService = notificationService;
    }

    public void handleFireEmergency(
            EmergencyEvent event
    ){

        User user = userRepository.findById(
                event.getUserId()
        ).orElseThrow(() ->
                new UserNotFoundException("User Not Found")
        );

        List<EmergencyContact> contacts =
                emergencyUtils.getEmergencyContacts(user);

        for(EmergencyContact contact : contacts){

            if(contact.getLinkedUser() != null){

                notificationService.sendFireEmergencyAlert(
                        contact.getLinkedUser(),
                        event
                );

            } else {
                log.info("Fallback fire emergency contact: {}", contact.getContactNumber());
            }
        }
    }
}