package com.CareWave.carewave_backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String RESEND_API_URL = "https://api.resend.com/emails";

    private final String apiKey;
    private final String fromEmail;
    private final String fromName;
    private final RestClient restClient;

    public EmailService(
            @Value("${resend.api.key:${RESEND_API_KEY:}}") String apiKey,
            @Value("${resend.from.email:${RESEND_FROM_EMAIL:onboarding@resend.dev}}") String fromEmail,
            @Value("${resend.from.name:${RESEND_FROM_NAME:CareWave}}") String fromName
    ) {
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.fromEmail = fromEmail != null ? fromEmail.trim() : "onboarding@resend.dev";
        this.fromName = fromName != null ? fromName.trim() : "CareWave";

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(5000);

        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .build();
    }

    public void sendSimpleEmail(String toEmail, String subject, String body) {
        log.info("[EMAIL] Send started for recipient domain: {}", getDomain(toEmail));

        if (apiKey.isEmpty()) {
            log.warn("[EMAIL] Resend API key is missing. Set RESEND_API_KEY environment variable.");
            throw new IllegalStateException("Email delivery unconfigured: RESEND_API_KEY missing");
        }

        String formattedFrom = (fromName == null || fromName.isEmpty())
                ? fromEmail
                : fromName + " <" + fromEmail + ">";

        Map<String, Object> payload = Map.of(
                "from", formattedFrom,
                "to", List.of(toEmail),
                "subject", subject,
                "text", body
        );

        try {
            log.info("[EMAIL] Dispatching request to Resend HTTPS API");
            var response = restClient.post()
                    .uri(RESEND_API_URL)
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("[EMAIL] Send successful via Resend API (HTTP {})", response.getStatusCode().value());
            } else {
                log.error("[EMAIL] Resend API returned non-2xx status code: {}", response.getStatusCode().value());
                throw new RuntimeException("Resend API error: HTTP " + response.getStatusCode().value());
            }
        } catch (Exception e) {
            log.error("[EMAIL] Send failed via Resend API: {}", e.getMessage());
            throw new RuntimeException("Failed to send email via Resend API: " + e.getMessage(), e);
        }
    }

    private String getDomain(String email) {
        if (email == null || !email.contains("@")) {
            return "unknown";
        }
        return email.substring(email.indexOf("@"));
    }
}
