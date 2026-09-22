package com.CareWave.carewave_backend.service;



import com.CareWave.carewave_backend.entity.User;
import com.CareWave.carewave_backend.exception.EmailAlreadyExistsException;
import com.CareWave.carewave_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;

    private final PasswordEncoder passwordEncoder;

    public boolean userExistsByPhoneNumber(String phoneNumber) {
        return userRepository.existsByContactNumber(phoneNumber);
    }

    //old user registration service
    public User registerUser(User user){

        if (userRepository.existsByEmail(user.getEmail())) {
            throw new EmailAlreadyExistsException("Email already registered");
        }

        user.setPassword(
                passwordEncoder.encode(
                        user.getPassword()
                )
        );

        return userRepository.save(user);
    }

    public User registerMobileUser(User user) {
        if (userRepository.existsByContactNumber(user.getContactNumber())) {
            throw new IllegalArgumentException("Contact number already registered");
        }
        if (user.getPassword() == null) {
            user.setPassword(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
        }
        if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
            if (userRepository.existsByEmail(user.getEmail())) {
                throw new EmailAlreadyExistsException("Email already registered");
            }
        }
        return userRepository.save(user);
    }

    public java.util.Optional<User> findUserByContactNumber(String contactNumber) {
        return userRepository.findByContactNumber(contactNumber);
    }

    public User save(User user) {
        return userRepository.save(user);
    }
}
