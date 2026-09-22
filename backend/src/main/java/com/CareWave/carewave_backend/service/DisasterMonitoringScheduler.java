package com.CareWave.carewave_backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class DisasterMonitoringScheduler {

    private static final Logger log = LoggerFactory.getLogger(DisasterMonitoringScheduler.class);

    private final EarthquakeMonitoringService earthquakeMonitoringService;
    private final WeatherMonitoringService weatherMonitoringService;
    private final AtomicBoolean isProcessing = new AtomicBoolean(false);

    public DisasterMonitoringScheduler(
            EarthquakeMonitoringService earthquakeMonitoringService,
            WeatherMonitoringService weatherMonitoringService
    ) {
        this.earthquakeMonitoringService = earthquakeMonitoringService;
        this.weatherMonitoringService = weatherMonitoringService;
    }

    @Scheduled(fixedRate = 600000) // Every 10 minutes
    public void runDisasterMonitoringPipeline() {
        if (!isProcessing.compareAndSet(false, true)) {
            log.warn("Scheduler execution skipped: Overlap protection active.");
            return;
        }

        try {
            log.info("Starting scheduled disaster monitoring task (Earthquakes + Weather).");
            
            // 1. Process Earthquakes
            earthquakeMonitoringService.fetchAndProcessEarthquakes();
            
            // 2. Process Weather Alerts
            weatherMonitoringService.fetchAndProcessWeatherAlerts();
            
        } catch (Exception e) {
            log.error("Error in scheduled disaster monitoring execution: {}", e.getMessage(), e);
        } finally {
            isProcessing.set(false);
        }
    }
}
