package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.dto.EmergencyContactResponse;
import com.CareWave.carewave_backend.entity.EmergencyContact;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.repository.EmergencyContactRepository;
import com.CareWave.carewave_backend.security.SecurityUtils;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EmergencyContactService {

    private final EmergencyContactRepository emergencyContactRepository;
    private final SecurityUtils securityUtils;
    private final com.CareWave.carewave_backend.repository.UserRepository userRepository;

    @org.springframework.beans.factory.annotation.Autowired
    private NotificationService notificationService;

    public EmergencyContactService(
            EmergencyContactRepository emergencyContactRepository,
            SecurityUtils securityUtils,
            com.CareWave.carewave_backend.repository.UserRepository userRepository
    ) {
        this.emergencyContactRepository = emergencyContactRepository;
        this.securityUtils = securityUtils;
        this.userRepository = userRepository;
    }

    public List<EmergencyContactResponse> getEmergencyContactsForCurrentUser() {
        User currentUser = securityUtils.getCurrentUser();
        List<EmergencyContact> contacts = emergencyContactRepository.findByOwnerUser(currentUser);
        return contacts.stream()
                .map(this::mapToContactResponse)
                .collect(Collectors.toList());
    }

    public EmergencyContactResponse createEmergencyContactForCurrentUser(com.CareWave.carewave_backend.dto.CreateEmergencyContactRequest request) {
        User currentUser = securityUtils.getCurrentUser();

        EmergencyContact contact = new EmergencyContact();
        contact.setFullName(request.getFullName());
        contact.setContactNumber(request.getContactNumber());
        contact.setOwnerUser(currentUser);

        try {
            contact.setRelation(com.CareWave.carewave_backend.enums.Relation.valueOf(request.getRelation().toUpperCase()));
        } catch (IllegalArgumentException e) {
            contact.setRelation(com.CareWave.carewave_backend.enums.Relation.OTHER);
        }

        java.util.Optional<User> linkedUserOpt = userRepository.findByContactNumber(request.getContactNumber());
        if (linkedUserOpt.isPresent()) {
            contact.setLinkedUser(linkedUserOpt.get());
        } else {
            contact.setLinkedUser(null);
        }

        EmergencyContact saved = emergencyContactRepository.save(contact);
        try {
            notificationService.sendContactNotification(currentUser, "Emergency Contact Added", saved.getFullName() + " was added as your emergency contact.");
        } catch (Exception e) {
            // ignore
        }
        return mapToContactResponse(saved);
    }

    public void deleteEmergencyContactForCurrentUser(java.util.UUID contactId) {
        User currentUser = securityUtils.getCurrentUser();
        EmergencyContact contact = emergencyContactRepository.findById(contactId)
                .orElseThrow(() -> new RuntimeException("Emergency contact not found"));

        if (!contact.getOwnerUser().getUserId().equals(currentUser.getUserId())) {
            throw new com.CareWave.carewave_backend.exception.UnauthorizedAccessException("You are not authorized to delete this contact");
        }

        try {
            notificationService.sendContactNotification(currentUser, "Emergency Contact Removed", contact.getFullName() + " was removed from your emergency contacts.");
        } catch (Exception e) {
            // ignore
        }
        emergencyContactRepository.delete(contact);
    }

    private EmergencyContactResponse mapToContactResponse(EmergencyContact contact) {
        EmergencyContactResponse res = new EmergencyContactResponse();
        res.setContactId(contact.getEmergencyContactId());
        res.setFullName(contact.getFullName());
        res.setContactNumber(contact.getContactNumber());
        res.setRelation(contact.getRelation() != null ? contact.getRelation().name() : null);
        res.setLinkedUserId(contact.getLinkedUser() != null ? contact.getLinkedUser().getUserId() : null);
        res.setLinkedToRegisteredUser(contact.getLinkedUser() != null);
        return res;
    }
}
