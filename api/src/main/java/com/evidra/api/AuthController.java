package com.evidra.api;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {

    private final JdbcTemplate jdbc;
    private final TokenService tokens;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final String defaultPassword;

    public AuthController(JdbcTemplate jdbc, TokenService tokens,
                          @Value("${app.default-password}") String defaultPassword) {
        this.jdbc = jdbc;
        this.tokens = tokens;
        this.defaultPassword = defaultPassword;
    }

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@RequestBody Map<String, Object> body) {
        String email = String.valueOf(body.getOrDefault("email", "")).trim().toLowerCase();
        String senha = String.valueOf(body.getOrDefault("senha", ""));

        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT id, organization_id, name, job_title, password_hash FROM users WHERE email = ?", email);
        if (rows.isEmpty()) return invalid();

        Map<String, Object> u = rows.get(0);
        int id = ((Number) u.get("id")).intValue();
        int org = ((Number) u.get("organization_id")).intValue();
        String hash = (String) u.get("password_hash");

        boolean ok;
        if ("TEMP".equals(hash)) {
            // first login: the placeholder is replaced by a real hash of the default password
            ok = senha.equals(defaultPassword);
            if (ok) jdbc.update("UPDATE users SET password_hash = ? WHERE id = ?", encoder.encode(senha), id);
        } else {
            ok = encoder.matches(senha, hash);
        }
        if (!ok) return invalid();

        String nome = (String) u.get("name");
        StringBuilder sigla = new StringBuilder();
        for (String p : nome.split(" ")) if (sigla.length() < 2 && !p.isEmpty()) sigla.append(p.charAt(0));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("token", tokens.create(id, org));
        out.put("nome", nome);
        out.put("cargo", u.get("job_title"));
        out.put("sigla", sigla.toString().toUpperCase());
        return ResponseEntity.ok(out);
    }

    private ResponseEntity<?> invalid() {
        // same answer for unknown e-mail and wrong password, so nobody can probe which e-mails exist
        return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
    }
}