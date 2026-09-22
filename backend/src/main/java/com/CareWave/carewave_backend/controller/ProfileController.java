package com.CareWave.carewave_backend.controller;

import com.CareWave.carewave_backend.dto.UserProfileDto;
import com.CareWave.carewave_backend.dto.UserProfileStatsDto;
import com.CareWave.carewave_backend.service.ProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ResponseEntity<UserProfileDto> getProfile() {
        return ResponseEntity.ok(profileService.getProfile());
    }

    @PutMapping
    public ResponseEntity<UserProfileDto> updateProfile(@RequestBody UserProfileDto dto) {
        return ResponseEntity.ok(profileService.updateProfile(dto));
    }

    @GetMapping("/stats")
    public ResponseEntity<UserProfileStatsDto> getProfileStats() {
        return ResponseEntity.ok(profileService.getProfileStats());
    }
}
