package com.CareWave.carewave_backend.exception;

public class SafeZoneNotFoundException extends RuntimeException {
    public SafeZoneNotFoundException(String message) {
        super(message);
    }
}
