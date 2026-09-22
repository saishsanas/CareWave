package com.CareWave.carewave_backend.config;

import com.CareWave.carewave_backend.repository.EmergencyContactRepository;
import com.CareWave.carewave_backend.repository.UserRepository;
import com.CareWave.carewave_backend.service.CustomUserDetailsService;
import com.CareWave.carewave_backend.service.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final Logger log = LoggerFactory.getLogger(WebSocketConfig.class);

    @Value("${cors.allowed-origins:http://localhost:8081,http://localhost:19006}")
    private String allowedOrigins;

    private final JwtService jwtService;
    private final CustomUserDetailsService customUserDetailsService;
    private final UserRepository userRepository;
    private final EmergencyContactRepository emergencyContactRepository;

    public WebSocketConfig(
            JwtService jwtService,
            CustomUserDetailsService customUserDetailsService,
            UserRepository userRepository,
            EmergencyContactRepository emergencyContactRepository
    ) {
        this.jwtService = jwtService;
        this.customUserDetailsService = customUserDetailsService;
        this.userRepository = userRepository;
        this.emergencyContactRepository = emergencyContactRepository;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());

        String[] originPatterns = origins.contains("*") ? new String[]{"*"} : origins.toArray(new String[0]);

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(originPatterns);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor != null) {
                    if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                        String authHeader = accessor.getFirstNativeHeader("Authorization");
                        String token = null;

                        if (authHeader != null && authHeader.startsWith("Bearer ")) {
                            token = authHeader.substring(7);
                        } else {
                            // Check query param pass token
                            List<String> tokenParams = accessor.getNativeHeader("token");
                            if (tokenParams != null && !tokenParams.isEmpty()) {
                                token = tokenParams.get(0);
                            }
                        }

                        if (token != null) {
                            try {
                                String email = jwtService.extractEmail(token);
                                if (email != null) {
                                    UserDetails userDetails = customUserDetailsService.loadUserByUsername(email);
                                    if (jwtService.isTokenValid(token, userDetails.getUsername())) {
                                        UsernamePasswordAuthenticationToken auth =
                                                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                                        accessor.setUser(auth);
                                        log.info("[WebSocket] Authenticated user: {}", email);
                                    }
                                }
                            } catch (Exception e) {
                                log.error("[WebSocket] Authentication failed: {}", e.getMessage());
                            }
                        }
                    } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                        String destination = accessor.getDestination();
                        if (destination != null && destination.startsWith("/topic/tracking/")) {
                            String protectedUserIdStr = destination.replace("/topic/tracking/", "");
                            try {
                                UUID protectedUserId = UUID.fromString(protectedUserIdStr);
                                if (accessor.getUser() == null) {
                                    throw new SecurityException("Unauthenticated WebSocket subscription attempt");
                                }
                                String authEmail = accessor.getUser().getName();
                                var subscriber = userRepository.findByEmail(authEmail)
                                        .or(() -> userRepository.findByContactNumber(authEmail))
                                        .orElse(null);
                                var protectedUser = userRepository.findById(protectedUserId).orElse(null);

                                if (subscriber != null && protectedUser != null) {
                                    boolean self = subscriber.getUserId().equals(protectedUserId);
                                    boolean isLinked = emergencyContactRepository.existsByOwnerUserAndLinkedUser(protectedUser, subscriber);
                                    if (!self && !isLinked) {
                                        throw new SecurityException("Unauthorized WebSocket subscription to target user tracking data");
                                    }
                                }
                            } catch (IllegalArgumentException e) {
                                log.warn("[WebSocket] Invalid destination user ID format: {}", destination);
                            }
                        }
                    }
                }
                return message;
            }
        });
    }
}
