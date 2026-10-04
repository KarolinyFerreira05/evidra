package com.evidra.api;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class WriteController {

    private static final Map<String, String> CAT_DB =
        Map.of("Ambiental", "ambiental", "Social", "social", "Governança", "governanca");
    private static final Pattern VALOR = Pattern.compile("^([\\d.,]+)\\s*(.*)$");

    private final JdbcTemplate jdbc;

    public WriteController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o).trim();
    }

    private void logActivity(String action, String detail) {
        jdbc.update(
            "INSERT INTO activity_log (organization_id, Auth.userId(), action, detail) VALUES (?, ?, ?, ?)",
            Auth.orgId(), Auth.userId(), action, detail);
    }

    // ---- Tick a task ----
    @PatchMapping("/tasks/{id}")
    public Map<String, Object> task(@PathVariable int id, @RequestBody Map<String, Object> body) {
        boolean done = Boolean.TRUE.equals(body.get("done"));
        jdbc.update("UPDATE tasks SET done = ? WHERE id = ? AND organization_id = ?", done, id, Auth.orgId());
        return Map.of("ok", true);
    }

    // ---- New indicator ----
    @PostMapping("/indicators")
    public ResponseEntity<?> newIndicator(@RequestBody Map<String, Object> body) {
        String nome = str(body.get("nome"));
        String cat = CAT_DB.get(str(body.get("cat")));
        Matcher m = VALOR.matcher(str(body.get("valor")));
        int prog;
        BigDecimal numero;
        try {
            prog = Math.max(0, Math.min(100, Integer.parseInt(str(body.get("prog")))));
            if (!m.matches()) throw new NumberFormatException();
            // Brazilian format: "." is thousands, "," is decimal ("1.240" = 1240, "0,8" = 0.8)
            numero = new BigDecimal(m.group(1).replace(".", "").replace(",", "."));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid data"));
        }
        if (nome.isEmpty() || cat == null)
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid data"));

        String unit = m.group(2).isBlank() ? null : m.group(2).trim();

        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO indicators (organization_id, name, category, unit, target_progress, owner_id) "
                + "VALUES (?, ?, ?, ?, ?, ?)", Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, Auth.orgId());
            ps.setString(2, nome);
            ps.setString(3, cat);
            ps.setString(4, unit);
            ps.setInt(5, prog);
            ps.setInt(6, Auth.userId());
            return ps;
        }, kh);
        int id = kh.getKey().intValue();

        jdbc.update(
            "INSERT INTO indicator_records (indicator_id, value, period, entered_by) VALUES (?, ?, CURDATE(), ?)",
            id, numero, Auth.userId());
        logActivity("adicionou um indicador", nome);
        return ResponseEntity.status(201).body(Map.of("id", id));
    }

    // ---- "Atualizar" / "Revisar" buttons ----
    @PostMapping("/indicators/{id}/refresh")
    public ResponseEntity<?> refresh(@PathVariable int id) {
        List<String> names = jdbc.queryForList(
            "SELECT name FROM indicators WHERE id = ? AND organization_id = ?", String.class, id, Auth.orgId());
        if (names.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Not found"));

        // confirms the current value: copies the latest record with today's date
        jdbc.update("""
            INSERT INTO indicator_records (indicator_id, value, period, entered_by)
            SELECT indicator_id, value, CURDATE(), ? FROM indicator_records
            WHERE indicator_id = ? ORDER BY created_at DESC, id DESC LIMIT 1
            """, Auth.userId(), id);
        jdbc.update("UPDATE indicators SET in_review = FALSE WHERE id = ?", id);
        logActivity("atualizou um indicador", names.get(0));
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ---- Invite person ----
    @PostMapping("/users")
    public ResponseEntity<?> invite(@RequestBody Map<String, Object> body) {
        String nome = str(body.get("nome"));
        String email = str(body.get("email")).toLowerCase();
        if (nome.isEmpty() || !email.matches("^\\S+@\\S+\\.\\S+$"))
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid data"));
        try {
            jdbc.update("""
                INSERT INTO users (organization_id, name, email, password_hash, job_title, focus_category)
                VALUES (?, ?, ?, 'TEMP', 'Convidado(a)', 'social')
                """, Auth.orgId(), nome, email);
        } catch (DuplicateKeyException e) {
            return ResponseEntity.status(409).body(Map.of("error", "Email already registered"));
        }
        logActivity("convidou uma pessoa", nome);
        return ResponseEntity.status(201).body(Map.of("ok", true));
    }

    // ---- Settings ----
    @PatchMapping("/organization")
    public ResponseEntity<?> settings(@RequestBody Map<String, Object> body) {
        String nome = str(body.get("nome"));
        String setor = str(body.get("setor"));
        int meta;
        try {
            meta = Integer.parseInt(str(body.get("meta")));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid data"));
        }
        if (nome.isEmpty() || meta < 1 || meta > 100)
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid data"));
        jdbc.update("UPDATE organizations SET name = ?, sector = ?, esg_target = ? WHERE id = ?",
            nome, setor.isEmpty() ? null : setor, meta, Auth.orgId());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ---- New report ----
    @PostMapping("/reports")
    public ResponseEntity<?> newReport(@RequestBody Map<String, Object> body) {
        String nome = str(body.get("nome"));
        if (nome.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Name required"));
        jdbc.update("INSERT INTO reports (organization_id, name) VALUES (?, ?)", Auth.orgId(), nome);
        logActivity("criou um relatório", nome);
        return ResponseEntity.status(201).body(Map.of("ok", true));
    }

    // ---- Evidence upload ----
    @PostMapping("/evidence")
    public ResponseEntity<?> upload(@RequestParam("arquivo") MultipartFile arquivo,
                                    @RequestParam(value = "nome", required = false) String nome)
            throws IOException {
        if (arquivo.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "No file"));

        String original = arquivo.getOriginalFilename() == null ? "arquivo" : arquivo.getOriginalFilename();
        String nomeFinal = (nome == null || nome.isBlank()) ? original : nome.trim();

        Path dir = Paths.get("uploads");
        Files.createDirectories(dir);
        String salvo = System.currentTimeMillis() + "-" + original.replaceAll("[^\\w.\\-]", "_");
        arquivo.transferTo(dir.resolve(salvo));

        jdbc.update("""
            INSERT INTO evidence (organization_id, indicator_id, file_name, file_path, uploaded_by)
            VALUES (?, NULL, ?, ?, ?)
            """, Auth.orgId(), nomeFinal, "uploads/" + salvo, Auth.userId());
        logActivity("adicionou uma evidência", nomeFinal);
        return ResponseEntity.status(201).body(Map.of("ok", true));
    }
}