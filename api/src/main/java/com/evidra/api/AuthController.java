package com.evidra.api;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
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

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, Object> body) {
        String email = String.valueOf(body.getOrDefault("email", "")).trim().toLowerCase();
        String senha = String.valueOf(body.getOrDefault("senha", ""));

        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT id, organization_id, name, job_title, password_hash, role FROM users WHERE email = ? AND active = TRUE", email);
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
        out.put("role", u.get("role"));
        return ResponseEntity.ok(out);
    }

    // the signed-in user as the database sees them now (role changes apply without a new login)
    @GetMapping("/me")
    public Map<String, Object> me() {
        return jdbc.queryForObject("SELECT name, email, job_title, focus_category, role FROM users WHERE id = ?", (rs, n) -> {
            String nome = rs.getString("name");
            StringBuilder sigla = new StringBuilder();
            for (String p : nome.split(" ")) if (sigla.length() < 2 && !p.isEmpty()) sigla.append(p.charAt(0));
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("id", Auth.userId());
            out.put("nome", nome);
            out.put("email", rs.getString("email"));
            out.put("cargo", rs.getString("job_title"));
            out.put("foco", rs.getString("focus_category"));
            out.put("sigla", sigla.toString().toUpperCase());
            out.put("role", rs.getString("role"));
            return out;
        }, Auth.userId());
    }

    // {"nome": "...", "cargo": "...", "foco": "ambiental"}: the signed-in user edits their own profile
    @PatchMapping("/me")
    public ResponseEntity<?> editarPerfil(@RequestBody Map<String, Object> body) {
        String nome = String.valueOf(body.getOrDefault("nome", "")).strip().replaceAll("\\s+", " ");
        String cargo = String.valueOf(body.getOrDefault("cargo", "")).strip();
        String foco = String.valueOf(body.getOrDefault("foco", "")).strip();
        if (nome.isEmpty()) throw new ApiErro(400, "Informe o seu nome.");
        if (nome.length() > 120) throw new ApiErro(400, "O nome pode ter no máximo 120 caracteres.");
        if (cargo.length() > 100) throw new ApiErro(400, "O cargo pode ter no máximo 100 caracteres.");
        if (!List.of("ambiental", "social", "governanca").contains(foco)) throw new ApiErro(400, "Escolha a sua área de foco.");
        jdbc.update("UPDATE users SET name = ?, job_title = ?, focus_category = ? WHERE id = ?",
            nome, cargo.isEmpty() ? null : cargo, foco, Auth.userId());
        return ResponseEntity.ok(me());
    }

    @PostMapping("/change-password")
public ResponseEntity<?> changePassword(@RequestBody Map<String, Object> body) {
    String atual = String.valueOf(body.getOrDefault("atual", ""));
    String nova = String.valueOf(body.getOrDefault("nova", ""));

    if (nova.length() < 8 || nova.length() > 72)
        return ResponseEntity.badRequest().body(Map.of("erro", "A nova senha precisa ter entre 8 e 72 caracteres."));
    if (nova.equals(defaultPassword) || nova.equals(atual))
        return ResponseEntity.badRequest().body(Map.of("erro", "Escolha uma senha diferente da atual e da senha padrão."));

    int id = Auth.userId();
    List<String> rows = jdbc.queryForList("SELECT password_hash FROM users WHERE id = ?", String.class, id);
    if (rows.isEmpty() || !encoder.matches(atual, rows.get(0)))
        return ResponseEntity.badRequest().body(Map.of("erro", "A senha atual está incorreta."));

    jdbc.update("UPDATE users SET password_hash = ? WHERE id = ?", encoder.encode(nova), id);
    return ResponseEntity.ok(Map.of("ok", true));
}

    private ResponseEntity<?> invalid() {
        // same answer for unknown e-mail and wrong password, so nobody can probe which e-mails exist
        return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
    }
}