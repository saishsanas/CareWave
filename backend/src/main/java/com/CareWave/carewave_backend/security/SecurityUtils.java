package com.CareWave.carewave_backend.security;

import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.exception.UserNotFoundException;
import com.CareWave.carewave_backend.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SecurityUtils {

    private final UserRepository userRepository;

    public SecurityUtils(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .or(() -> userRepository.findByContactNumber(email))
                .orElseThrow(() -> new UserNotFoundException("Authenticated user not found: " + email));
    }
}
