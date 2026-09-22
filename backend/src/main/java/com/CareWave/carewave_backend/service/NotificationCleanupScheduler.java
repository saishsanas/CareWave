package com.CareWave.carewave_backend.service;

import com.CareWave.carewave_backend.repository.NotificationHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
public class NotificationCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(NotificationCleanupScheduler.class);
    private final NotificationHistoryRepository notificationHistoryRepository;

    public NotificationCleanupScheduler(NotificationHistoryRepository notificationHistoryRepository) {
        this.notificationHistoryRepository = notificationHistoryRepository;
    }

    // Runs once a day at midnight (0 0 0 * * ?)
    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void cleanupOldNotifications() {
        LocalDateTime threshold = LocalDateTime.now().minusDays(90);
        log.info("Starting notification history cleanup. Threshold: {}", threshold);
        try {
            int deleted = notificationHistoryRepository.deleteByCreatedAtBefore(threshold);
            log.info("Notification history cleanup complete. Deleted {} notifications older than 90 days.", deleted);
        } catch (Exception e) {
            log.error("Error occurred during notification cleanup: {}", e.getMessage(), e);
        }
    }
}
