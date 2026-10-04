package com.evidra.api;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;

@Component
public class TokenService {

    private final Algorithm alg;

    public TokenService(@Value("${app.jwt-secret}") String secret) {
        this.alg = Algorithm.HMAC256(secret);
    }

    public String create(int userId, int orgId) {
        return JWT.create()
            .withSubject(String.valueOf(userId))
            .withClaim("org", orgId)
            .withExpiresAt(Instant.now().plus(8, ChronoUnit.HOURS))
            .sign(alg);
    }

    public DecodedJWT verify(String token) {
        return JWT.require(alg).build().verify(token);
    }
}