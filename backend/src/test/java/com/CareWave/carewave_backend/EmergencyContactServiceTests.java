package com.CareWave.carewave_backend;

import com.CareWave.carewave_backend.dto.CreateEmergencyContactRequest;
import com.CareWave.carewave_backend.dto.EmergencyContactResponse;
import com.CareWave.carewave_backend.entity.EmergencyContact;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.enums.Relation;
import com.CareWave.carewave_backend.repository.EmergencyContactRepository;
import com.CareWave.carewave_backend.repository.UserRepository;
import com.CareWave.carewave_backend.security.SecurityUtils;
import com.CareWave.carewave_backend.service.EmergencyContactService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EmergencyContactServiceTests {

    private EmergencyContactService emergencyContactService;

    @Mock private EmergencyContactRepository emergencyContactRepository;
    @Mock private SecurityUtils securityUtils;
    @Mock private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        emergencyContactService = new EmergencyContactService(
                emergencyContactRepository,
                securityUtils,
                userRepository
        );
    }

    @Test
    void testGetEmergencyContacts_Success() {
        User currentUser = new User();
        currentUser.setUserId(UUID.randomUUID());

        User linkedUser = new User();
        UUID linkedUserId = UUID.randomUUID();
        linkedUser.setUserId(linkedUserId);

        EmergencyContact contact1 = new EmergencyContact();
        contact1.setEmergencyContactId(UUID.randomUUID());
        contact1.setFullName("Jane Doe");
        contact1.setContactNumber("1234567890");
        contact1.setRelation(Relation.MOTHER);
        contact1.setLinkedUser(linkedUser);

        EmergencyContact contact2 = new EmergencyContact();
        contact2.setEmergencyContactId(UUID.randomUUID());
        contact2.setFullName("John Smith");
        contact2.setContactNumber("0987654321");
        contact2.setRelation(Relation.FRIEND);
        contact2.setLinkedUser(null);

        List<EmergencyContact> mockContacts = List.of(contact1, contact2);

        when(securityUtils.getCurrentUser()).thenReturn(currentUser);
        when(emergencyContactRepository.findByOwnerUser(currentUser)).thenReturn(mockContacts);

        List<EmergencyContactResponse> result = emergencyContactService.getEmergencyContactsForCurrentUser();

        assertEquals(2, result.size());

        // Assert first contact
        assertEquals(contact1.getEmergencyContactId(), result.get(0).getContactId());
        assertEquals("Jane Doe", result.get(0).getFullName());
        assertEquals("1234567890", result.get(0).getContactNumber());
        assertEquals("MOTHER", result.get(0).getRelation());
        assertEquals(linkedUserId, result.get(0).getLinkedUserId());
        assertTrue(result.get(0).isLinkedToRegisteredUser());

        // Assert second contact
        assertEquals(contact2.getEmergencyContactId(), result.get(1).getContactId());
        assertEquals("John Smith", result.get(1).getFullName());
        assertEquals("0987654321", result.get(1).getContactNumber());
        assertEquals("FRIEND", result.get(1).getRelation());
        assertNull(result.get(1).getLinkedUserId());
        assertFalse(result.get(1).isLinkedToRegisteredUser());
    }

    @Test
    void testGetEmergencyContacts_Empty() {
        User currentUser = new User();
        currentUser.setUserId(UUID.randomUUID());

        when(securityUtils.getCurrentUser()).thenReturn(currentUser);
        when(emergencyContactRepository.findByOwnerUser(currentUser)).thenReturn(new ArrayList<>());

        List<EmergencyContactResponse> result = emergencyContactService.getEmergencyContactsForCurrentUser();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testCreateEmergencyContact_WithLinkedUser() {
        User currentUser = new User();
        currentUser.setUserId(UUID.randomUUID());

        User linkedUser = new User();
        UUID linkedUserId = UUID.randomUUID();
        linkedUser.setUserId(linkedUserId);
        linkedUser.setContactNumber("1234567890");

        CreateEmergencyContactRequest request = new CreateEmergencyContactRequest();
        request.setFullName("Jane Doe");
        request.setContactNumber("1234567890");
        request.setRelation("MOTHER");

        EmergencyContact contactToSave = new EmergencyContact();
        contactToSave.setEmergencyContactId(UUID.randomUUID());
        contactToSave.setFullName(request.getFullName());
        contactToSave.setContactNumber(request.getContactNumber());
        contactToSave.setRelation(Relation.MOTHER);
        contactToSave.setOwnerUser(currentUser);
        contactToSave.setLinkedUser(linkedUser);

        when(securityUtils.getCurrentUser()).thenReturn(currentUser);
        when(userRepository.findByContactNumber(request.getContactNumber())).thenReturn(Optional.of(linkedUser));
        when(emergencyContactRepository.save(any(EmergencyContact.class))).thenReturn(contactToSave);

        EmergencyContactResponse response = emergencyContactService.createEmergencyContactForCurrentUser(request);

        assertNotNull(response);
        assertEquals("Jane Doe", response.getFullName());
        assertEquals("1234567890", response.getContactNumber());
        assertEquals("MOTHER", response.getRelation());
        assertEquals(linkedUserId, response.getLinkedUserId());
        assertTrue(response.isLinkedToRegisteredUser());
    }

    @Test
    void testCreateEmergencyContact_WithoutLinkedUser() {
        User currentUser = new User();
        currentUser.setUserId(UUID.randomUUID());

        CreateEmergencyContactRequest request = new CreateEmergencyContactRequest();
        request.setFullName("Unknown User");
        request.setContactNumber("9999999999");
        request.setRelation("OTHER");

        EmergencyContact contactToSave = new EmergencyContact();
        contactToSave.setEmergencyContactId(UUID.randomUUID());
        contactToSave.setFullName(request.getFullName());
        contactToSave.setContactNumber(request.getContactNumber());
        contactToSave.setRelation(Relation.OTHER);
        contactToSave.setOwnerUser(currentUser);
        contactToSave.setLinkedUser(null);

        when(securityUtils.getCurrentUser()).thenReturn(currentUser);
        when(userRepository.findByContactNumber(request.getContactNumber())).thenReturn(Optional.empty());
        when(emergencyContactRepository.save(any(EmergencyContact.class))).thenReturn(contactToSave);

        EmergencyContactResponse response = emergencyContactService.createEmergencyContactForCurrentUser(request);

        assertNotNull(response);
        assertEquals("Unknown User", response.getFullName());
        assertEquals("9999999999", response.getContactNumber());
        assertEquals("OTHER", response.getRelation());
        assertNull(response.getLinkedUserId());
        assertFalse(response.isLinkedToRegisteredUser());
    }

    @Test
    void testDeleteEmergencyContact_Success() {
        User currentUser = new User();
        UUID currentUserId = UUID.randomUUID();
        currentUser.setUserId(currentUserId);

        EmergencyContact contact = new EmergencyContact();
        UUID contactId = UUID.randomUUID();
        contact.setEmergencyContactId(contactId);
        contact.setOwnerUser(currentUser);

        when(securityUtils.getCurrentUser()).thenReturn(currentUser);
        when(emergencyContactRepository.findById(contactId)).thenReturn(Optional.of(contact));

        assertDoesNotThrow(() -> emergencyContactService.deleteEmergencyContactForCurrentUser(contactId));
        verify(emergencyContactRepository, times(1)).delete(contact);
    }
}
