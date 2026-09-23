package com.CareWave.carewave_backend.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;

@Service
public class JwtService {

    @Value("${jwt.secret:}")
    private String secret;

    @jakarta.annotation.PostConstruct
    public void init() {
        if (secret == null || secret.isBlank()) {
            org.slf4j.LoggerFactory.getLogger(JwtService.class)
                    .warn("[JWT] JWT_SECRET environment variable is empty. Using default development secret key.");
            secret = "c3VwZXItc2VjcmV0LWtleS1mb3ItY2FyZXdhdmUtZGV2ZWxvcG1lbnQtZW52aXJvbm1lbnQtMjUyNTY=";
        }
    }

    private Key getSigningKey(){

        byte[] keyBytes =
                Decoders.BASE64.decode(secret);

        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(String userIdentifier){

        return Jwts.builder()
                .setSubject(userIdentifier)
                .setIssuedAt(new Date())
                .setExpiration(
                        new Date(
                                System.currentTimeMillis()
                                        + 1000 * 60 * 60 * 24
                        )
                )
                .signWith(
                        getSigningKey(),
                        SignatureAlgorithm.HS256
                )
                .compact();
    }

    public String extractEmail(String token){

        return extractClaims(token)
                .getSubject();
    }

    public boolean isTokenValid(
            String token,
            String email
    ){

        String extractedEmail =
                extractEmail(token);

        return extractedEmail.equals(email)
                && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token){

        return extractClaims(token)
                .getExpiration()
                .before(new Date());
    }

    private Claims extractClaims(String token){

        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}