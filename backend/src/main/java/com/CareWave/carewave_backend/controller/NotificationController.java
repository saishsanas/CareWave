package com.CareWave.carewave_backend.controller;

import com.CareWave.carewave_backend.dto.NotificationResponse;
import com.CareWave.carewave_backend.dto.UnreadCountResponse;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.security.SecurityUtils;
import com.CareWave.carewave_backend.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final SecurityUtils securityUtils;

    public NotificationController(NotificationService notificationService, SecurityUtils securityUtils) {
        this.notificationService = notificationService;
        this.securityUtils = securityUtils;
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications() {
        User currentUser = securityUtils.getCurrentUser();
        return ResponseEntity.ok(notificationService.getNotifications(currentUser));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountResponse> getUnreadCount() {
        User currentUser = securityUtils.getCurrentUser();
        return ResponseEntity.ok(notificationService.getUnreadCount(currentUser));
    }

    @PutMapping("/read/{notificationId}")
    public ResponseEntity<Void> markAsRead(@PathVariable UUID notificationId) {
        User currentUser = securityUtils.getCurrentUser();
        notificationService.markAsRead(currentUser, notificationId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead() {
        User currentUser = securityUtils.getCurrentUser();
        notificationService.markAllAsRead(currentUser);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{notificationId}")
    public ResponseEntity<Void> deleteNotification(@PathVariable UUID notificationId) {
        User currentUser = securityUtils.getCurrentUser();
        notificationService.deleteNotification(currentUser, notificationId);
        return ResponseEntity.ok().build();
    }
}
