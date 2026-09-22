package com.CareWave.carewave_backend.exception;

public class ActiveEmergencyExistsException extends RuntimeException {
    public ActiveEmergencyExistsException(String message) {
        super(message);
    }
}
