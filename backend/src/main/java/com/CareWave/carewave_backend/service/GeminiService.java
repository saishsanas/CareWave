package com.CareWave.carewave_backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    @Value("${gemini.api.key:${GEMINI_API_KEY:}}")
    private String geminiApiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public GeminiService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    public enum EmergencyType {
        HEART_ATTACK,
        FIRE,
        EARTHQUAKE,
        FLOOD,
        GENERAL
    }

    private EmergencyType detectEmergencyType(String prompt) {
        if (prompt == null) {
            return EmergencyType.GENERAL;
        }
        String lower = prompt.toLowerCase();
        if (lower.contains("heart") || lower.contains("cardiac") || lower.contains("cpr") 
                || lower.contains("chest pain") || lower.contains("responsiveness") || lower.contains("aed")) {
            return EmergencyType.HEART_ATTACK;
        }
        if (lower.contains("fire") || lower.contains("smoke") || lower.contains("burn") 
                || lower.contains("flame") || lower.contains("evacuate") || lower.contains("extinguisher")) {
            return EmergencyType.FIRE;
        }
        if (lower.contains("earthquake") || lower.contains("quake") || lower.contains("shake") 
                || lower.contains("shaking") || lower.contains("tremor")) {
            return EmergencyType.EARTHQUAKE;
        }
        if (lower.contains("flood") || lower.contains("water") || lower.contains("tsunami") 
                || lower.contains("drown") || lower.contains("heavy rain") || lower.contains("inundation")) {
            return EmergencyType.FLOOD;
        }
        return EmergencyType.GENERAL;
    }

    private String getHeartAttackFallback() {
        return "Immediate Action\n\n"
                + "• Call emergency services immediately.\n"
                + "• Check responsiveness.\n\n"
                + "While Waiting\n\n"
                + "• Begin CPR if trained.\n"
                + "• Use AED if available.\n\n"
                + "Emergency Contact\n\n"
                + "• Call 112 immediately if required";
    }

    private String getFireFallback() {
        return "Immediate Action\n\n"
                + "• Evacuate immediately.\n"
                + "• Do not use elevators.\n\n"
                + "While Waiting\n\n"
                + "• Stay low to avoid smoke.\n"
                + "• Contact fire services.\n\n"
                + "Emergency Contact\n\n"
                + "• Call 112 immediately if required";
    }

    private String getEarthquakeFallback() {
        return "Immediate Action\n\n"
                + "• Drop, Cover, and Hold On.\n"
                + "• Stay away from windows.\n\n"
                + "While Waiting\n\n"
                + "• Move to an open area after shaking stops.\n\n"
                + "Emergency Contact\n\n"
                + "• Call 112 immediately if required";
    }

    private String getFloodFallback() {
        return "Immediate Action\n\n"
                + "• Move to higher ground.\n"
                + "• Avoid walking through floodwater.\n\n"
                + "While Waiting\n\n"
                + "• Follow official evacuation instructions.\n\n"
                + "Emergency Contact\n\n"
                + "• Call 112 immediately if required";
    }

    private String getGeneralFallback() {
        return "Immediate Action\n\n"
                + "• Call emergency services.\n"
                + "• Ensure scene safety.\n\n"
                + "While Waiting\n\n"
                + "• Stay with affected persons.\n"
                + "• Follow trained first-aid procedures.\n\n"
                + "Emergency Contact\n\n"
                + "• Call 112 immediately if required";
    }

    private String getFallbackResponse(String prompt) {
        EmergencyType type = detectEmergencyType(prompt);
        String guidance;
        switch (type) {
            case HEART_ATTACK:
                guidance = getHeartAttackFallback();
                break;
            case FIRE:
                guidance = getFireFallback();
                break;
            case EARTHQUAKE:
                guidance = getEarthquakeFallback();
                break;
            case FLOOD:
                guidance = getFloodFallback();
                break;
            case GENERAL:
            default:
                guidance = getGeneralFallback();
                break;
        }
        return guidance 
                + "\n\nThis guidance is informational and does not replace professional emergency responders."
                + "\n\n[Emergency fallback guidance]";
    }

    private String invokeModel(String model, String userPrompt) throws Exception {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + geminiApiKey;

        // Strict emergency system prompt instruction set
        String systemPrompt = "You are the CareWave AI Emergency Assistant. Your sole purpose is to provide safety, evacuation, first-response, and preparedness guidance during emergencies (e.g., fire, flood, earthquake, personal safety).\n\n"
                + "Response Formatting Rules:\n"
                + "1. DO NOT use any markdown symbols, including asterisks (* or **), hashes (#), horizontal rules (---), or markdown tables.\n"
                + "2. Use plain text only.\n"
                + "3. You MUST structure your response exactly as follows (separated by blank lines, using '•' for bullets):\n\n"
                + "Immediate Action\n\n"
                + "• [Step 1]\n"
                + "• [Step 2]\n\n"
                + "While Waiting\n\n"
                + "• [Step 1]\n"
                + "• [Step 2]\n\n"
                + "Emergency Contact\n\n"
                + "• Call 112 immediately if required\n\n"
                + "4. Keep the response under 150 words unless the user asks for more detail.\n"
                + "5. Use short, mobile-friendly sentences optimized for reading quickly during an emergency.\n"
                + "6. Provide a maximum of 6 bullet points per section.\n"
                + "7. DO NOT provide medical diagnoses, prescribe medications, or give legal advice.\n"
                + "8. DO NOT pretend to be active emergency responders or dispatchers.\n"
                + "9. If the user query is completely unrelated to emergencies, safety, response, or preparedness, politely decline in plain text and explain your purpose.";

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", userPrompt)
                        ))
                ),
                "systemInstruction", Map.of(
                        "parts", List.of(
                                Map.of("text", systemPrompt)
                        )
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            JsonNode root = objectMapper.readTree(response.getBody());
            if (root.has("error")) {
                throw new RuntimeException(root.path("error").path("message").asText());
            }
            String responseText = root.path("candidates")
                    .path(0)
                    .path("content")
                    .path("parts")
                    .path(0)
                    .path("text")
                    .asText();
            if (responseText == null || responseText.trim().isEmpty()) {
                throw new RuntimeException("Empty response received from model.");
            }
            return responseText;
        } else {
            throw new RuntimeException("HTTP Status " + response.getStatusCode());
        }
    }

    public String generateEmergencyGuidance(String userPrompt) {
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            System.err.println("[AI] Configuration Error: Gemini API key is missing on the server.");
            return getFallbackResponse(userPrompt);
        }

        System.out.println("[AI] Primary model request started");

        try {
            // Attempt primary model: gemini-2.5-flash
            String responseText = invokeModel("gemini-2.5-flash", userPrompt);
            return responseText + "\n\n[AI-generated guidance]";
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            int statusCode = e.getRawStatusCode();
            String errorName = (statusCode == 503) ? "UNAVAILABLE" : ((statusCode == 429) ? "RESOURCE_EXHAUSTED" : e.getStatusText());
            System.err.println("[AI] Primary model failed: " + statusCode + " " + errorName);

            // Check if it is a 503 Service Unavailable / UNAVAILABLE / high demand
            if (statusCode == 503 || e.getResponseBodyAsString().contains("UNAVAILABLE") || e.getResponseBodyAsString().contains("high demand")) {
                System.out.println("[AI] Attempting fallback model");
                try {
                    // Attempt secondary model: gemini-flash-latest
                    String fallbackResponseText = invokeModel("gemini-flash-latest", userPrompt);
                    System.out.println("[AI] Fallback model succeeded");
                    return fallbackResponseText + "\n\n[AI-generated guidance]";
                } catch (org.springframework.web.client.HttpStatusCodeException fe) {
                    int fStatusCode = fe.getRawStatusCode();
                    String fErrorName = (fStatusCode == 503) ? "UNAVAILABLE" : ((fStatusCode == 429) ? "RESOURCE_EXHAUSTED" : fe.getStatusText());
                    System.err.println("[AI] Fallback model failed: " + fStatusCode + " " + fErrorName);
                } catch (Exception fe) {
                    System.err.println("[AI] Fallback model failed: " + fe.getMessage());
                }
            }
        } catch (Exception e) {
            System.err.println("[AI] Primary model failed: " + e.getMessage());
        }

        // Return structured, category-aware built-in guidance when all external models fail
        System.out.println("[AI] Returning built-in emergency guidance");
        return getFallbackResponse(userPrompt);
    }
}

