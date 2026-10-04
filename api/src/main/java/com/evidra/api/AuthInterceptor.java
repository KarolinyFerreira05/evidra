package com.evidra.api;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    private final TokenService tokens;

    public AuthInterceptor(TokenService tokens) {
        this.tokens = tokens;
    }

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        if ("OPTIONS".equals(req.getMethod())) return true; // browser pre-check, no token yet

        String header = req.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            res.setStatus(401);
            return false;
        }
        try {
            DecodedJWT jwt = tokens.verify(header.substring(7));
            req.setAttribute("userId", Integer.parseInt(jwt.getSubject()));
            req.setAttribute("orgId", jwt.getClaim("org").asInt());
            return true;
        } catch (JWTVerificationException | NumberFormatException e) {
            res.setStatus(401);
            return false;
        }
    }
}