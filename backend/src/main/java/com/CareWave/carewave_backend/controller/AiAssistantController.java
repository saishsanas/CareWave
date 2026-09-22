package com.CareWave.carewave_backend.controller;

import com.CareWave.carewave_backend.dto.AiChatRequest;
import com.CareWave.carewave_backend.dto.AiChatResponse;
import com.CareWave.carewave_backend.service.GeminiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ai")
public class AiAssistantController {

    private final GeminiService geminiService;

    public AiAssistantController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    @PostMapping("/chat")
    public ResponseEntity<AiChatResponse> getChatGuidance(@RequestBody AiChatRequest request) {
        String answer = geminiService.generateEmergencyGuidance(request.getMessage());
        AiChatResponse response = new AiChatResponse();
        response.setResponse(answer);
        return ResponseEntity.ok(response);
    }
}
