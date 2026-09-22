package com.CareWave.carewave_backend.controller;

import com.CareWave.carewave_backend.dto.MobileAuthResponse;
import com.CareWave.carewave_backend.dto.MobileLoginRequest;
import com.CareWave.carewave_backend.dto.MobileRegisterRequest;
import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.exception.UserNotFoundException;
import com.CareWave.carewave_backend.repository.UserRepository;
import com.CareWave.carewave_backend.security.SecurityUtils;
import com.CareWave.carewave_backend.service.AuthRateLimiterService;
import com.CareWave.carewave_backend.service.AuthService;
import com.CareWave.carewave_backend.service.EmailService;
import com.CareWave.carewave_backend.service.JwtService;
import com.CareWave.carewave_backend.service.NotificationService;
import com.CareWave.carewave_backend.service.OtpService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final AuthService authService;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final OtpService otpService;
    private final AuthRateLimiterService authRateLimiterService;

    @PostMapping("/check-user")
    public ResponseEntity<?> checkUser(
            @RequestBody Map<String, String> request,
            HttpServletRequest httpRequest
    ) {
        authRateLimiterService.checkRateLimit(httpRequest);

        String phoneNumber = request.get("phoneNumber");

        Optional<User> userOpt = authService.findUserByContactNumber(phoneNumber);

        Map<String, Object> response = new HashMap<>();
        if (userOpt.isPresent()) {
            response.put("exists", true);
            response.put("email", userOpt.get().getEmail());
        } else {
            response.put("exists", false);
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/mobile-register")
    public ResponseEntity<?> mobileRegister(
            @RequestBody MobileRegisterRequest request,
            HttpServletRequest httpRequest
    ) {
        authRateLimiterService.checkRateLimit(httpRequest);

        if (request.getFirstName() == null || request.getFirstName().trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "First name is required"));
        }

        if (request.getContactNumber() == null || request.getContactNumber().trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Contact number is required"));
        }

        if (request.getBloodGroup() == null || request.getBloodGroup().trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Blood group is required"));
        }

        if (request.getGender() == null || request.getGender().trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Gender is required"));
        }

        User user = new User();
        user.setFirstName(request.getFirstName().trim());
        user.setContactNumber(request.getContactNumber().trim());
        user.setFcmToken(request.getFcmToken());
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            user.setEmail(request.getEmail().trim());
        }

        try {
            String normalizedBloodGroup = request.getBloodGroup()
                    .trim()
                    .replace("+", "_POSITIVE")
                    .replace("-", "_NEGATIVE")
                    .toUpperCase();

            user.setBloodGroup(
                    com.CareWave.carewave_backend.enums.BloodGroup.valueOf(normalizedBloodGroup)
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid blood group value"));
        }

        try {
            user.setGender(
                    com.CareWave.carewave_backend.enums.Gender.valueOf(
                            request.getGender().trim().toUpperCase()
                    )
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid gender value"));
        }

        User savedUser = authService.registerMobileUser(user);
        String token = jwtService.generateToken(savedUser.getContactNumber());

        MobileAuthResponse response = new MobileAuthResponse();
        response.setToken(token);
        response.setUserId(savedUser.getUserId());
        response.setFirstName(savedUser.getFirstName());
        response.setContactNumber(savedUser.getContactNumber());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/mobile-login")
    public ResponseEntity<?> mobileLogin(
            @RequestBody MobileLoginRequest request,
            HttpServletRequest httpRequest
    ) {
        authRateLimiterService.checkRateLimit(httpRequest);

        try {
            User user = authService.findUserByContactNumber(
                    request.getContactNumber()
            ).orElseThrow(() ->
                    new UserNotFoundException("User not found")
            );

            if (request.getFcmToken() != null && !request.getFcmToken().isBlank()) {
                user.setFcmToken(request.getFcmToken());
                authService.save(user);
            }

            String token = jwtService.generateToken(user.getContactNumber());

            MobileAuthResponse response = new MobileAuthResponse();
            response.setToken(token);
            response.setUserId(user.getUserId());
            response.setFirstName(user.getFirstName());
            response.setContactNumber(user.getContactNumber());

            return ResponseEntity.ok(response);
        } catch (UserNotFoundException e) {
            throw e;
        } catch (Exception e) {
            log.error("Mobile login failed", e);
            throw e;
        }
    }

    @PostMapping("/send-email-otp")
    public ResponseEntity<?> sendEmailOtp(
            @RequestBody Map<String, String> request,
            HttpServletRequest httpRequest
    ) {
        authRateLimiterService.checkRateLimit(httpRequest);

        String email = request.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email field is required"));
        }

        String phoneNumber = request.get("phoneNumber");

        if (userRepository.existsByEmail(email.trim())) {
            boolean isOwnEmail = false;
            if (phoneNumber != null && !phoneNumber.trim().isEmpty()) {
                Optional<User> existingUser = userRepository.findByContactNumber(phoneNumber.trim());
                if (existingUser.isPresent() && email.trim().equalsIgnoreCase(existingUser.get().getEmail())) {
                    isOwnEmail = true;
                }
            }
            if (!isOwnEmail) {
                return ResponseEntity.status(409).body(Map.of(
                        "success", false,
                        "message", "Email is already associated with another account. Please use a different email or sign in."
                ));
            }
        }

        try {
            String otp = otpService.generateAndStoreOtp(email.trim());
            emailService.sendSimpleEmail(
                    email.trim(),
                    "CareWave Login Verification",
                    "Hello,\n\n"
                            + "Your CareWave verification code is:\n\n"
                            + otp
                            + "\n\n"
                            + "This code will expire in 5 minutes.\n\n"
                            + "If you did not request this code, please ignore this email.\n\n"
                            + "Thank you,\n"
                            + "CareWave Team"
            );
            return ResponseEntity.ok(Map.of("success", true));
        } catch (IllegalStateException e) {
            if ("COOLDOWN_ACTIVE".equals(e.getMessage())) {
                return ResponseEntity.status(429).body(Map.of(
                        "success", false,
                        "message", "Resend cooldown active. Please wait 30 seconds."
                ));
            }
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Unable to process OTP request"
            ));
        } catch (Exception e) {
            log.error("Failed to send email OTP", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to send OTP code"
            ));
        }
    }

    @PostMapping("/verify-email-otp")
    public ResponseEntity<?> verifyEmailOtp(
            @RequestBody Map<String, String> request,
            HttpServletRequest httpRequest
    ) {
        authRateLimiterService.checkRateLimit(httpRequest);

        String email = request.get("email");
        String otp = request.get("otp");

        if (email == null || email.trim().isEmpty() || otp == null || otp.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and OTP are required"));
        }

        OtpService.VerificationResult result = otpService.verifyOtp(email.trim(), otp.trim());

        if (result.isVerified()) {
            return ResponseEntity.ok(Map.of("verified", true));
        } else {
            return ResponseEntity.ok(Map.of(
                    "verified", false,
                    "reason", result.getReason()
            ));
        }
    }
}
