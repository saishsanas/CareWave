package com.CareWave.carewave_backend.exception;

public class TrackingSessionExpiredException extends RuntimeException {
    public TrackingSessionExpiredException(String message) {
        super(message);
    }
}
