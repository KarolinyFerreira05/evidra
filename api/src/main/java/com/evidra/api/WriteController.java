package com.evidra.api;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Types;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

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
            "INSERT INTO activity_log (organization_id, user_id, action, detail) VALUES (?, ?, ?, ?)",
            Auth.orgId(), Auth.userId(), action, detail);
    }

    // ---- New indicator ----
    @PostMapping("/indicators")
    public ResponseEntity<?> newIndicator(@RequestBody Map<String, Object> body) {
        Auth.exigir(Auth.RESPONSAVEL);
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

        int frequencia;
        try {
            frequencia = str(body.get("frequencia")).isEmpty() ? 90 : Integer.parseInt(str(body.get("frequencia")));
        } catch (NumberFormatException e) {
            throw new ApiErro(400, "A frequência de atualização vai de 1 a 3650 dias.");
        }
        if (frequencia < 1 || frequencia > 3650) throw new ApiErro(400, "A frequência de atualização vai de 1 a 3650 dias.");

        String unit = m.group(2).isBlank() ? null : m.group(2).trim();
        String gri = IndicatorController.griCodigo(body.get("griCodigo"));
        Integer ods = IndicatorController.ods(body.get("ods"));

        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO indicators (organization_id, name, category, unit, target_progress, owner_id, gri_code, ods, update_frequency_days) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, Auth.orgId());
            ps.setString(2, nome);
            ps.setString(3, cat);
            ps.setString(4, unit);
            ps.setInt(5, prog);
            ps.setInt(6, Auth.userId());
            ps.setString(7, gri);
            ps.setObject(8, ods, Types.TINYINT);
            ps.setInt(9, frequencia);
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
        Auth.exigir(Auth.RESPONSAVEL);
        List<String> names = jdbc.queryForList(
            "SELECT name FROM indicators WHERE id = ? AND organization_id = ? AND archived = FALSE", String.class, id, Auth.orgId());
        if (names.isEmpty()) throw new ApiErro(404, "Indicador não encontrado.");

        // confirms the current value: copies the latest record (by reference date) with today's date
        jdbc.update("""
            INSERT INTO indicator_records (indicator_id, value, period, entered_by)
            SELECT indicator_id, value, CURDATE(), ? FROM indicator_records
            WHERE indicator_id = ? ORDER BY period DESC, created_at DESC, id DESC LIMIT 1
            """, Auth.userId(), id);
        jdbc.update("UPDATE indicators SET in_review = FALSE WHERE id = ?", id);
        logActivity("atualizou um indicador", names.get(0));
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ---- Settings ----
    @PatchMapping("/organization")
    public ResponseEntity<?> settings(@RequestBody Map<String, Object> body) {
        Auth.exigir(); // settings: admin only
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
        logActivity("alterou as configurações da organização", nome);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
