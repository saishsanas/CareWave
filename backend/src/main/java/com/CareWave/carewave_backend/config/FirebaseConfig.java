package com.CareWave.carewave_backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Configuration
public class FirebaseConfig {

    @Value("${firebase.config.path:${FIREBASE_CONFIG_PATH:${GOOGLE_APPLICATION_CREDENTIALS:}}}")
    private String configPath;

    @Value("${firebase.credentials.json:${FIREBASE_CREDENTIALS_JSON:}}")
    private String credentialsJson;

    @PostConstruct
    public void initialize() {
        if (!FirebaseApp.getApps().isEmpty()) {
            return;
        }

        InputStream credentialsStream = null;
        boolean explicitlyConfigured = false;

        try {
            if (credentialsJson != null && !credentialsJson.trim().isEmpty()) {
                explicitlyConfigured = true;
                credentialsStream = new ByteArrayInputStream(credentialsJson.getBytes(StandardCharsets.UTF_8));
            } else if (configPath != null && !configPath.trim().isEmpty()) {
                explicitlyConfigured = true;
                String path = configPath.trim();
                if (path.startsWith("classpath:")) {
                    String resourcePath = path.substring("classpath:".length());
                    ClassPathResource resource = new ClassPathResource(resourcePath);
                    if (resource.exists()) {
                        credentialsStream = resource.getInputStream();
                    } else {
                        throw new IllegalStateException("Firebase credential resource not found on classpath: " + resourcePath);
                    }
                } else {
                    File file = new File(path);
                    if (file.exists()) {
                        credentialsStream = new FileInputStream(file);
                    } else {
                        throw new IllegalStateException("Firebase credential file not found at: " + path);
                    }
                }
            } else {
                // Fallback 1: Classpath resource
                InputStream classPathStream = getClass().getClassLoader().getResourceAsStream("firebase-service-account.json");
                if (classPathStream != null) {
                    credentialsStream = classPathStream;
                } else {
                    // Fallback 2: Local development file path
                    File localFile = new File("src/main/resources/firebase-service-account.json");
                    if (localFile.exists()) {
                        credentialsStream = new FileInputStream(localFile);
                    }
                }
            }

            if (credentialsStream == null) {
                System.err.println("WARNING: Firebase initialization skipped because no Firebase credentials were configured or found.");
                return;
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(credentialsStream))
                    .build();

            FirebaseApp.initializeApp(options);
            System.out.println("Firebase Initialized Successfully");

        } catch (Exception e) {
            if (explicitlyConfigured) {
                throw new IllegalStateException("Failed to initialize Firebase with explicitly configured credentials", e);
            }
            throw new RuntimeException("Failed to initialize Firebase with available credentials", e);
        } finally {
            if (credentialsStream != null) {
                try {
                    credentialsStream.close();
                } catch (Exception ignored) {
                }
            }
        }
    }
}
