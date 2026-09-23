package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.entity.DisasterEvent;
import com.CareWave.carewave_backend.entity.EmergencyEvent;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.entity.NotificationHistory;
import com.CareWave.carewave_backend.dto.NotificationResponse;
import com.CareWave.carewave_backend.dto.UnreadCountResponse;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    @org.springframework.beans.factory.annotation.Autowired
    private com.CareWave.carewave_backend.repository.NotificationHistoryRepository notificationHistoryRepository;

    @org.springframework.beans.factory.annotation.Autowired
    private com.CareWave.carewave_backend.repository.UserRepository userRepository;

    private void saveToHistory(User recipient, String title, String message, String type) {
        try {
            if (recipient == null) return;
            NotificationHistory history = new NotificationHistory();
            history.setUserId(recipient.getUserId());
            history.setTitle(title);
            history.setMessage(message);
            history.setNotificationType(type);
            history.setCreatedAt(java.time.LocalDateTime.now());
            history.setRead(false);
            notificationHistoryRepository.save(history);
            log.info("Saved notification history for user: {} | Type: {}", recipient.getUserId(), type);
        } catch (Exception e) {
            log.error("Failed to save notification to history database: {}", e.getMessage());
        }
    }

    public void sendContactNotification(User recipient, String title, String body) {
        saveToHistory(recipient, title, body, "CONTACT_EVENT");
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<NotificationResponse> getNotifications(User currentUser) {
        return notificationHistoryRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getUserId()).stream()
                .map(n -> NotificationResponse.builder()
                        .notificationId(n.getNotificationId())
                        .title(n.getTitle())
                        .message(n.getMessage())
                        .notificationType(n.getNotificationType())
                        .createdAt(n.getCreatedAt())
                        .isRead(n.isRead())
                        .build())
                .collect(Collectors.toList());
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public UnreadCountResponse getUnreadCount(User currentUser) {
        long count = notificationHistoryRepository.countByUserIdAndIsReadFalse(currentUser.getUserId());
        return new UnreadCountResponse(count);
    }

    @org.springframework.transaction.annotation.Transactional
    public void markAsRead(User currentUser, UUID notificationId) {
        NotificationHistory notification = notificationHistoryRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        if (!notification.getUserId().equals(currentUser.getUserId())) {
            throw new com.CareWave.carewave_backend.exception.UnauthorizedAccessException("Unauthorized access");
        }
        notification.setRead(true);
        notificationHistoryRepository.save(notification);
    }

    @org.springframework.transaction.annotation.Transactional
    public void markAllAsRead(User currentUser) {
        List<NotificationHistory> history = notificationHistoryRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getUserId());
        for (NotificationHistory n : history) {
            if (!n.isRead()) {
                n.setRead(true);
                notificationHistoryRepository.save(n);
            }
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteNotification(User currentUser, UUID notificationId) {
        NotificationHistory notification = notificationHistoryRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        if (!notification.getUserId().equals(currentUser.getUserId())) {
            throw new com.CareWave.carewave_backend.exception.UnauthorizedAccessException("Unauthorized access");
        }
        notificationHistoryRepository.delete(notification);
    }

    private String getUserFullName(User user) {
        if (user == null) return "Someone";
        String name = user.getFirstName();
        if (user.getLastName() != null && !user.getLastName().isBlank()) {
            name += " " + user.getLastName();
        }
        return name;
    }

    private String getVictimDisplayName(UUID userId) {
        if (userId == null) return "Someone";
        return userRepository.findById(userId)
                .map(this::getUserFullName)
                .orElse("Someone");
    }

    public void sendEmergencyAlert(User user, EmergencyEvent event) {
        String victimName = getVictimDisplayName(event.getUserId());
        String title = "🚨 Medical Emergency Alert";
        String body = victimName + " has triggered a medical emergency. Tap to view live location and emergency details.";
        saveToHistory(user, title, body, "SOS_ALERT");

        try {
            if (com.google.firebase.FirebaseApp.getApps().isEmpty()) {
                log.warn("FirebaseApp not initialized. Skipping FCM push notification.");
                return;
            }
            if (user.getFcmToken() == null || user.getFcmToken().isBlank()) {
                log.warn("User FCM token missing. Suppressed Medical Emergency Alert.");
                return;
            }
            Message message = Message.builder()
                    .setToken(user.getFcmToken())
                    .setNotification(
                            Notification.builder()
                                    .setTitle(title)
                                    .setBody(body)
                                    .build()
                    )
                    .putData("emergencyId", event.getEmergencyId().toString())
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            log.info("Notification Sent Successfully: {}", response);
        } catch (Exception e) {
            log.error("Failed To Send Notification: {}", e.getMessage(), e);
        }
    }

    public void sendPoliceEmergencyAlert(User user, EmergencyEvent event) {
        String victimName = getVictimDisplayName(event.getUserId());
        String title = "🚔 Safety Emergency Alert";
        String body = victimName + " has triggered a police emergency. Tap to view live location and emergency details.";
        saveToHistory(user, title, body, "SOS_ALERT");

        try {
            if (com.google.firebase.FirebaseApp.getApps().isEmpty()) {
                log.warn("FirebaseApp not initialized. Skipping FCM push notification.");
                return;
            }
            if (user.getFcmToken() == null || user.getFcmToken().isBlank()) {
                log.warn("User FCM token missing. Suppressed Police Emergency Alert.");
                return;
            }
            Message message = Message.builder()
                    .setToken(user.getFcmToken())
                    .setNotification(
                            Notification.builder()
                                    .setTitle(title)
                                    .setBody(body)
                                    .build()
                    )
                    .putData("emergencyId", event.getEmergencyId().toString())
                    .putData("emergencyType", "POLICE")
                    .build();

            FirebaseMessaging.getInstance().send(message);
            log.info("Police alert notification sent successfully.");
        } catch (Exception e) {
            log.error("Failed To Send Police Alert: {}", e.getMessage(), e);
        }
    }

    public void sendFireEmergencyAlert(User user, EmergencyEvent event) {
        String victimName = getVictimDisplayName(event.getUserId());
        String title = "🔥 Fire Emergency Alert";
        String body = victimName + " has triggered a fire emergency. Tap to view live location and emergency details.";
        saveToHistory(user, title, body, "SOS_ALERT");

        try {
            if (com.google.firebase.FirebaseApp.getApps().isEmpty()) {
                log.warn("FirebaseApp not initialized. Skipping FCM push notification.");
                return;
            }
            if (user.getFcmToken() == null || user.getFcmToken().isBlank()) {
                log.warn("User FCM token missing. Suppressed Fire Emergency Alert.");
                return;
            }
            Message message = Message.builder()
                    .setToken(user.getFcmToken())
                    .setNotification(
                            Notification.builder()
                                    .setTitle(title)
                                    .setBody(body)
                                    .build()
                    )
                    .putData("emergencyId", event.getEmergencyId().toString())
                    .putData("emergencyType", "FIRE")
                    .putData("fireSeverity", String.valueOf(event.getFireSeverity()))
                    .putData("evacuationMessage", event.getEvacuationMessage())
                    .build();

            FirebaseMessaging.getInstance().send(message);
            log.info("Fire alert notification sent successfully.");
        } catch (Exception e) {
            log.error("Failed To Send Fire Alert: {}", e.getMessage(), e);
        }
    }

    public void sendSafeZoneBreachAlert(User guardian, User protectedUser, String zoneName) {
        String title = "⚠️ Safe Zone Breach Alert";
        String body = getUserFullName(protectedUser) + " exited Safe Zone: " + zoneName;
        saveToHistory(guardian, title, body, "GEOFENCE_EVENT");

        try {
            if (guardian.getFcmToken() == null || guardian.getFcmToken().isBlank()) {
                log.warn("Guardian FCM token missing. Suppressed Safe-Zone Breach Notification: {} exited Safe Zone: {}", 
                        protectedUser.getFirstName(), zoneName);
                return;
            }
            Message message = Message.builder()
                    .setToken(guardian.getFcmToken())
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .build();
            FirebaseMessaging.getInstance().send(message);
            log.info("Safe-zone breach notification sent to guardian: {}", guardian.getUserId());
        } catch (Exception e) {
            log.error("FCM Error in sendSafeZoneBreachAlert: {}", e.getMessage(), e);
        }
    }

    public void sendGpsDisabledAlert(User guardian, User protectedUser) {
        String title = "⚠️ GPS Disabled Alert";
        String body = "Location unavailable for " + getUserFullName(protectedUser) + ". GPS was disabled.";
        saveToHistory(guardian, title, body, "GEOFENCE_EVENT");

        try {
            if (guardian.getFcmToken() == null || guardian.getFcmToken().isBlank()) {
                log.warn("Guardian FCM token missing. Suppressed GPS Disabled Notification for {}", protectedUser.getFirstName());
                return;
            }
            Message message = Message.builder()
                    .setToken(guardian.getFcmToken())
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .build();
            FirebaseMessaging.getInstance().send(message);
            log.info("GPS disabled notification sent to guardian: {}", guardian.getUserId());
        } catch (Exception e) {
            log.error("FCM Error in sendGpsDisabledAlert: {}", e.getMessage(), e);
        }
    }

    public void sendOfflineAlert(User guardian, User protectedUser) {
        String title = "⚠️ User Offline Alert";
        String body = "Location updates unavailable for " + getUserFullName(protectedUser) + " (Offline > 30 mins).";
        saveToHistory(guardian, title, body, "GEOFENCE_EVENT");

        try {
            if (guardian.getFcmToken() == null || guardian.getFcmToken().isBlank()) {
                log.warn("Guardian FCM token missing. Suppressed Offline Alert for {}", protectedUser.getFirstName());
                return;
            }
            Message message = Message.builder()
                    .setToken(guardian.getFcmToken())
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .build();
            FirebaseMessaging.getInstance().send(message);
            log.info("Offline notification sent to guardian: {}", guardian.getUserId());
        } catch (Exception e) {
            log.error("FCM Error in sendOfflineAlert: {}", e.getMessage(), e);
        }
    }

    public void sendTrackingActivatedAlert(User guardian, User protectedUser, int durationMinutes) {
        String title = "🔒 Emergency Tracking Active";
        String body = "Temporary emergency live tracking enabled for " + durationMinutes + " minutes.";
        saveToHistory(guardian, title, body, "MONITORING_EVENT");

        try {
            if (guardian.getFcmToken() == null || guardian.getFcmToken().isBlank()) {
                log.warn("Guardian FCM token missing. Suppressed Tracking Activated Alert for {}", protectedUser.getFirstName());
                return;
            }
            Message message = Message.builder()
                    .setToken(guardian.getFcmToken())
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .build();
            FirebaseMessaging.getInstance().send(message);
            log.info("Live tracking activation notification sent to guardian: {}", guardian.getUserId());
        } catch (Exception e) {
            log.error("FCM Error in sendTrackingActivatedAlert: {}", e.getMessage(), e);
        }
    }

    public void sendTrackingExpiredAlert(User guardian, User protectedUser) {
        String title = "ℹ️ Tracking Session Expired";
        String body = "Live tracking session for " + protectedUser.getFirstName() + " has expired.";
        saveToHistory(guardian, title, body, "MONITORING_EVENT");

        try {
            if (guardian.getFcmToken() == null || guardian.getFcmToken().isBlank()) {
                log.warn("Guardian FCM token missing. Suppressed Tracking Expired Alert for {}", protectedUser.getFirstName());
                return;
            }
            Message message = Message.builder()
                    .setToken(guardian.getFcmToken())
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .build();
            FirebaseMessaging.getInstance().send(message);
            log.info("Live tracking expiration notification sent to guardian: {}", guardian.getUserId());
        } catch (Exception e) {
            log.error("FCM Error in sendTrackingExpiredAlert: {}", e.getMessage(), e);
        }
    }

    public void sendReturnToSafeZoneAlert(User guardian, User protectedUser) {
        String title = "✅ Return to Safe Zone";
        String body = getUserFullName(protectedUser) + " safely returned to Safe Zone.";
        saveToHistory(guardian, title, body, "GEOFENCE_EVENT");

        try {
            if (guardian.getFcmToken() == null || guardian.getFcmToken().isBlank()) {
                log.warn("Warning: Guardian FCM token missing. Suppressed Return to Safe Zone Alert for {}", protectedUser.getFirstName());
                return;
            }
            Message message = Message.builder()
                    .setToken(guardian.getFcmToken())
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .build();
            FirebaseMessaging.getInstance().send(message);
            log.info("Safe-zone return notification sent to guardian: {}", guardian.getUserId());
        } catch (Exception e) {
            log.error("FCM Error in sendReturnToSafeZoneAlert: {}", e.getMessage(), e);
        }
    }

    public void sendAlertCancelledNotification(User guardian, User protectedUser) {
        String title = "ℹ️ Alert Cancelled";
        String body = "Emergency alert for " + protectedUser.getFirstName() + " has been cancelled/resolved.";
        saveToHistory(guardian, title, body, "MONITORING_EVENT");

        try {
            if (guardian.getFcmToken() == null || guardian.getFcmToken().isBlank()) {
                log.warn("Warning: Guardian FCM token missing. Suppressed Alert Cancelled Alert for {}", protectedUser.getFirstName());
                return;
            }
            Message message = Message.builder()
                    .setToken(guardian.getFcmToken())
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .build();
            FirebaseMessaging.getInstance().send(message);
            log.info("Alert cancelled notification sent to guardian: {}", guardian.getUserId());
        } catch (Exception e) {
            log.error("FCM Error in sendAlertCancelledNotification: {}", e.getMessage(), e);
        }
    }

    public void sendEarthquakeAlert(User recipient, User affectedUser, DisasterEvent event, String confidenceLevel, boolean isEmergencyContact) {
        sendEarthquakeAlertAndReturnId(recipient, affectedUser, event, confidenceLevel, isEmergencyContact);
    }

    public String sendEarthquakeAlertAndReturnId(User recipient, User affectedUser, DisasterEvent event, String confidenceLevel, boolean isEmergencyContact) {
        String title = event.getSeverity() + " Earthquake Alert";
        String body;

        if (isEmergencyContact) {
            body = "A magnitude " + event.getMagnitude() + " earthquake was detected near the last known location of " 
                    + getUserFullName(affectedUser) + ".";
        } else {
            if ("HIGH".equals(confidenceLevel)) {
                body = "A magnitude " + event.getMagnitude() + " earthquake was detected near your last known location.";
            } else {
                body = "A magnitude " + event.getMagnitude() + " earthquake was detected near your recently recorded location.";
            }
        }
        saveToHistory(recipient, title, body, "SYSTEM_EVENT");

        try {
            if (recipient.getFcmToken() == null || recipient.getFcmToken().isBlank()) {
                log.warn("Warning: Recipient FCM token missing. Suppressed Earthquake Alert for user ID: {}", recipient.getUserId());
                return "SKIPPED_MISSING_FCM_TOKEN";
            }

            Message message = Message.builder()
                    .setToken(recipient.getFcmToken())
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .putData("disasterType", event.getDisasterType())
                    .putData("magnitude", String.valueOf(event.getMagnitude()))
                    .putData("locationName", event.getLocationName() != null ? event.getLocationName() : "")
                    .putData("severity", event.getSeverity())
                    .putData("occurredAt", event.getOccurredAt().toString())
                    .putData("confidenceLevel", confidenceLevel)
                    .build();

            String responseId = FirebaseMessaging.getInstance().send(message);
            log.info("Disaster alert notification sent successfully to user: {}", recipient.getUserId());
            return responseId;
        } catch (Exception e) {
            log.error("FCM Error sending earthquake alert: {}", e.getMessage(), e);
            return "ERROR: " + e.getMessage();
        }
    }

    public void sendWeatherAlert(User recipient, User affectedUser, DisasterEvent event, String confidenceLevel, boolean isEmergencyContact) {
        sendWeatherAlertAndReturnId(recipient, affectedUser, event, confidenceLevel, isEmergencyContact);
    }

    public String sendWeatherAlertAndReturnId(User recipient, User affectedUser, DisasterEvent event, String confidenceLevel, boolean isEmergencyContact) {
        String title = event.getSeverity() + " " + capitalize(event.getDisasterType()) + " Alert";
        String body;
        String typeName = event.getDisasterType().toLowerCase();

        if (isEmergencyContact) {
            body = "A severe " + typeName + " warning was detected near the last known location of " 
                    + getUserFullName(affectedUser) + ".";
        } else {
            if ("HIGH".equals(confidenceLevel)) {
                body = "A severe " + typeName + " warning was detected near your last known location.";
            } else {
                body = "A severe " + typeName + " warning was detected near your recently recorded location.";
            }
        }
        saveToHistory(recipient, title, body, "SYSTEM_EVENT");

        try {
            if (recipient.getFcmToken() == null || recipient.getFcmToken().isBlank()) {
                log.warn("Warning: Recipient FCM token missing. Suppressed Weather Alert for user ID: {}", recipient.getUserId());
                return "SKIPPED_MISSING_FCM_TOKEN";
            }

            Message message = Message.builder()
                    .setToken(recipient.getFcmToken())
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .putData("disasterType", event.getDisasterType())
                    .putData("locationName", event.getLocationName() != null ? event.getLocationName() : "")
                    .putData("severity", event.getSeverity())
                    .putData("occurredAt", event.getOccurredAt().toString())
                    .putData("confidenceLevel", confidenceLevel)
                    .build();

            String responseId = FirebaseMessaging.getInstance().send(message);
            log.info("Weather alert notification sent successfully to user: {}", recipient.getUserId());
            return responseId;
        } catch (Exception e) {
            log.error("FCM Error sending weather alert: {}", e.getMessage(), e);
            return "ERROR: " + e.getMessage();
        }
    }

    private String capitalize(String text) {
        if (text == null || text.isEmpty()) return "Weather";
        return text.substring(0, 1).toUpperCase() + text.substring(1).toLowerCase();
    }

    public void sendWomenSafetyAlertToUser(User user, EmergencyEvent event) {
        String title = "Women Safety Emergency Alert";
        String body = "Your women safety emergency alert has been activated. Emergency contacts have been notified and live tracking is enabled.";
        saveToHistory(user, title, body, "SOS_ALERT");

        try {
            if (user.getFcmToken() == null || user.getFcmToken().isBlank()) {
                log.warn("User FCM token missing for women safety alert.");
                return;
            }

            Message message = Message.builder()
                    .setToken(user.getFcmToken())
                    .setNotification(
                            Notification.builder()
                                    .setTitle(title)
                                    .setBody(body)
                                    .build()
                    )
                    .putData("emergencyId", event.getEmergencyId().toString())
                    .putData("emergencyType", "PERSONAL_SAFETY")
                    .build();

            FirebaseMessaging.getInstance().send(message);
            log.info("Women safety alert sent to user: {}", user.getUserId());
        } catch (Exception e) {
            log.error("Failed to send women safety alert to user: {}", e.getMessage(), e);
        }
    }

    public void sendWomenSafetyAlertToContact(User guardian, User affectedUser, EmergencyEvent event) {
        String victimName = getUserFullName(affectedUser);
        String title = "🚨 SOS Emergency Alert";
        String body = victimName + " needs immediate assistance.\n" +
                "Live location tracking has been activated.\n" +
                "Tap to view emergency details and location.";
        saveToHistory(guardian, title, body, "SOS_ALERT");

        try {
            if (guardian.getFcmToken() == null || guardian.getFcmToken().isBlank()) {
                log.warn("Guardian FCM token missing for women safety alert.");
                return;
            }

            Message message = Message.builder()
                    .setToken(guardian.getFcmToken())
                    .setNotification(
                            Notification.builder()
                                    .setTitle(title)
                                    .setBody(body)
                                    .build()
                    )
                    .putData("emergencyId", event.getEmergencyId().toString())
                    .putData("emergencyType", "PERSONAL_SAFETY")
                    .build();

            FirebaseMessaging.getInstance().send(message);
            log.info("Women safety alert sent to guardian: {}", guardian.getUserId());
        } catch (Exception e) {
            log.error("Failed to send women safety alert to guardian: {}", e.getMessage(), e);
        }
    }

    public void sendEmergencyTrackingAlertToUser(User user, String emergencyType) {
        String title = "PERSONAL_SAFETY".equals(emergencyType) ? "Women Safety Emergency Alert" : "Emergency Alert";
        String body = "Your emergency alert has been activated. Emergency contacts have been notified and live tracking is enabled.";
        saveToHistory(user, title, body, "SOS_ALERT");

        try {
            if (user.getFcmToken() == null || user.getFcmToken().isBlank()) {
                log.warn("User FCM token missing for emergency alert.");
                return;
            }

            Message message = Message.builder()
                    .setToken(user.getFcmToken())
                    .setNotification(
                            Notification.builder()
                                    .setTitle(title)
                                    .setBody(body)
                                    .build()
                    )
                    .putData("emergencyType", emergencyType)
                    .build();

            FirebaseMessaging.getInstance().send(message);
            log.info("Emergency alert sent to user: {}", user.getUserId());
        } catch (Exception e) {
            log.error("Failed to send emergency alert to user: {}", e.getMessage(), e);
        }
    }

    public void sendEmergencyTrackingAlertToContact(User guardian, User affectedUser, String emergencyType) {
        String title = "PERSONAL_SAFETY".equals(emergencyType) ? "Women Safety Emergency Alert" : "Emergency Alert";
        String body = getUserFullName(affectedUser) + " triggered an emergency alert. Live location tracking has been activated.";
        saveToHistory(guardian, title, body, "SOS_ALERT");

        try {
            if (guardian.getFcmToken() == null || guardian.getFcmToken().isBlank()) {
                log.warn("Guardian FCM token missing for emergency alert.");
                return;
            }

            Message message = Message.builder()
                    .setToken(guardian.getFcmToken())
                    .setNotification(
                            Notification.builder()
                                    .setTitle(title)
                                    .setBody(body)
                                    .build()
                    )
                    .putData("emergencyType", emergencyType)
                    .build();

            FirebaseMessaging.getInstance().send(message);
            log.info("Emergency alert sent to guardian: {}", guardian.getUserId());
        } catch (Exception e) {
            log.error("Failed to send emergency alert to guardian: {}", e.getMessage(), e);
        }
    }

    public void sendAcknowledgementNotification(User victim, User guardian) {
        String guardianName = getUserFullName(guardian);
        String title = "Emergency Alert Acknowledged";
        String body = guardianName + " has received your emergency alert, acknowledged it, and is actively monitoring your live location to assist you.";
        
        saveToHistory(victim, title, body, "SOS_ALERT");

        if (victim.getFcmToken() == null || victim.getFcmToken().isBlank()) {
            log.warn("Victim FCM token missing. Suppressed Acknowledgement Notification for {}", victim.getFirstName());
            return;
        }

        try {
            Message message = Message.builder()
                    .setToken(victim.getFcmToken())
                    .setNotification(
                            Notification.builder()
                                    .setTitle(title)
                                    .setBody(body)
                                    .build()
                    )
                    .build();

            FirebaseMessaging.getInstance().send(message);
            log.info("Acknowledgement Notification Sent Successfully to Victim: {}", victim.getUserId());
        } catch (Exception e) {
            log.error("Failed To Send Acknowledgement Notification to Victim: {}", e.getMessage(), e);
        }
    }
}