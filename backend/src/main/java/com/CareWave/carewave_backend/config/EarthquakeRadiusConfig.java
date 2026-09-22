package com.CareWave.carewave_backend.config;

public final class EarthquakeRadiusConfig {

    private EarthquakeRadiusConfig() {
        // Prevent instantiation
    }

    // Dynamic radiuses in kilometers
    public static final double MODERATE_RADIUS_KM = 80.0;
    public static final double HIGH_RADIUS_KM = 150.0;
    public static final double CRITICAL_RADIUS_KM = 300.0;
}
