package com.CareWave.carewave_backend.service;



import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CustomUserDetailsService
        implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(
            UserRepository userRepository
    ) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(
            String username
    ) throws UsernameNotFoundException {

        User user = userRepository
                .findByEmail(username)
                .or(() -> userRepository.findByContactNumber(username))
                .orElseThrow(() ->
                        new UsernameNotFoundException(
                                "User Not Found with identifier: " + username
                        )
                );

        return new org.springframework.security.core.userdetails.User(
                username,
                user.getPassword(),
                List.of(
                        new SimpleGrantedAuthority("USER")
                )
        );
    }
}