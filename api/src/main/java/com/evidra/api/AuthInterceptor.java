package com.evidra.api;

import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    private final TokenService tokens;
    private final JdbcTemplate jdbc;

    public AuthInterceptor(TokenService tokens, JdbcTemplate jdbc) {
        this.tokens = tokens;
        this.jdbc = jdbc;
    }

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        if ("OPTIONS".equals(req.getMethod())) return true; // browser pre-check, no token yet

        String header = req.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            res.setStatus(401);
            return false;
        }
        int userId, orgId;
        try {
            DecodedJWT jwt = tokens.verify(header.substring(7));
            userId = Integer.parseInt(jwt.getSubject());
            orgId = jwt.getClaim("org").asInt();
        } catch (JWTVerificationException | NumberFormatException | NullPointerException e) {
            res.setStatus(401);
            return false;
        }

        // the token only says who signed in; the database says who they are now
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT organization_id, role FROM users WHERE id = ? AND active = TRUE", userId);
        // missing, deactivated, or moved to another organization: the token no longer counts
        if (rows.isEmpty() || ((Number) rows.get(0).get("organization_id")).intValue() != orgId) {
            res.setStatus(401);
            return false;
        }
        req.setAttribute("userId", userId);
        req.setAttribute("orgId", orgId);
        req.setAttribute("role", rows.get(0).get("role"));
        return true;
    }
}
