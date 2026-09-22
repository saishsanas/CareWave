package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.entity.EmergencyContact;
import com.CareWave.carewave_backend.entity.EmergencyEvent;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.exception.UserNotFoundException;
import com.CareWave.carewave_backend.repository.EmergencyContactRepository;
import com.CareWave.carewave_backend.repository.EmergencyRepository;
import com.CareWave.carewave_backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PoliceEmergencyService {

    private final UserRepository userRepository;
    private final EmergencyUtils emergencyUtils;
    private final NotificationService notificationService;

    public PoliceEmergencyService(UserRepository userRepository, EmergencyUtils emergencyUtils,   NotificationService notificationService) {
        this.userRepository = userRepository;
        this.emergencyUtils = emergencyUtils;
        this.notificationService = notificationService;
    }

    public void handlePoliceEmergency(EmergencyEvent event){

        User user= userRepository.findById(event.getUserId())
                .orElseThrow(()->
                        new UserNotFoundException("User Not Found"));

        List<EmergencyContact> contacts = emergencyUtils.getEmergencyContacts(user);

        for(EmergencyContact contact : contacts){

            if(contact.getLinkedUser()!= null){
                notificationService.sendPoliceEmergencyAlert(
                        contact.getLinkedUser(),
                        event
                );
            }
        }
    }
}
