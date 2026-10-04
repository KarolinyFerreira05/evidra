package com.evidra.api;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class IndicatorController {

    private final JdbcTemplate jdbc;

    public IndicatorController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/indicators")
    public List<Map<String, Object>> list() {
        String sql = """
            SELECT i.id, i.name, i.category, i.unit, i.target_progress, i.in_review,
                   i.update_frequency_days, u.name AS owner_name,
                   r.value, r.created_at AS last_update,
                   TIMESTAMPDIFF(MONTH, r.created_at, NOW()) AS months_ago
            FROM indicators i
            LEFT JOIN users u ON u.id = i.owner_id
            LEFT JOIN indicator_records r ON r.id = (
                SELECT id FROM indicator_records
                WHERE indicator_id = i.id
                ORDER BY created_at DESC, id DESC LIMIT 1)
            WHERE i.organization_id = ?
            """;

        NumberFormat nf = NumberFormat.getNumberInstance(Locale.of("pt", "BR"));

        return jdbc.query(sql, (rs, n) -> {
            Timestamp last = rs.getTimestamp("last_update");
            long days = last == null ? Long.MAX_VALUE
                    : ChronoUnit.DAYS.between(last.toLocalDateTime(), LocalDateTime.now());
            String status = rs.getBoolean("in_review") ? "Em revisão"
                    : days > rs.getInt("update_frequency_days") ? "Desatualizado"
                    : "Atualizado";

            BigDecimal value = rs.getBigDecimal("value");
            String unit = rs.getString("unit");
            String sep = ("%".equals(unit) || "h/pessoa".equals(unit)) ? "" : " ";
            String valor = nf.format(value)
                    + (unit != null && !unit.isBlank() ? sep + unit : "");

            String cat = switch (rs.getString("category")) {
                case "ambiental" -> "Ambiental";
                case "social" -> "Social";
                default -> "Governança";
            };

            String owner = rs.getString("owner_name");
            String sigla = "";
            if (owner != null) {
                for (String p : owner.split(" ")) {
                    if (sigla.length() < 2 && !p.isEmpty()) sigla += p.charAt(0);
                }
                sigla = sigla.toUpperCase();
            }

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", rs.getInt("id"));
            m.put("nome", rs.getString("name"));
            m.put("cat", cat);
            m.put("valor", valor);
            m.put("tend", 0);
            m.put("prog", rs.getInt("target_progress"));
            m.put("status", status);
            m.put("ha", rs.getInt("months_ago"));
            m.put("resp", sigla);
            return m;
        }, Auth.orgId());
    }
}