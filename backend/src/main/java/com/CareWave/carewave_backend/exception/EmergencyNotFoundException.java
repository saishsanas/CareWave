package com.CareWave.carewave_backend.exception;

public class EmergencyNotFoundException extends RuntimeException {
    public EmergencyNotFoundException(String message) {
        super(message);
    }
}
