package com.evidra.api;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReadController {

    private static final DateTimeFormatter BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter BR_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final JdbcTemplate jdbc;

    public ReadController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // builds a JSON object from key, value, key, value...
    private static Map<String, Object> row(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    private static String tempo(Timestamp t) {
        long h = ChronoUnit.HOURS.between(t.toLocalDateTime(), LocalDateTime.now());
        if (h < 1) return "agora";
        if (h < 24) return "há " + h + "h";
        long d = h / 24;
        return d == 1 ? "ontem" : "há " + d + " dias";
    }

    @GetMapping("/evidence")
    public List<Map<String, Object>> evidence() {
        return jdbc.query("""
            SELECT e.id, e.indicator_id, e.file_name, e.description, e.status, e.uploaded_at, i.name AS indicator, u.name AS uploader,
                   e.uploaded_by, e.review_note, e.reviewed_at, r.name AS reviewer,
                   e.file_content IS NOT NULL AS has_file
            FROM evidence e
            LEFT JOIN indicators i ON i.id = e.indicator_id
            JOIN users u ON u.id = e.uploaded_by
            LEFT JOIN users r ON r.id = e.reviewed_by
            WHERE e.organization_id = ?
            ORDER BY e.uploaded_at DESC
            """, (rs, n) -> {
                String ind = rs.getString("indicator");
                String st = switch (rs.getString("status")) {
                    case "aprovada" -> "Aprovada";
                    case "rejeitada" -> "Rejeitada";
                    default -> "Em análise";
                };
                Integer indicadorId = rs.getObject("indicator_id", Integer.class);
                return row("id", rs.getInt("id"),
                           "indicadorId", indicadorId,
                           "nome", rs.getString("file_name"),
                           "descricao", rs.getString("description"),
                           "ind", ind != null ? ind : "Sem indicador vinculado",
                           "quem", rs.getString("uploader"),
                           "data", rs.getTimestamp("uploaded_at").toLocalDateTime().format(BR),
                           "status", st,
                           "arquivo", rs.getBoolean("has_file"),
                           "enviadoPorId", rs.getInt("uploaded_by"),
                           "revisor", rs.getString("reviewer"),
                           "revisadoEm", rs.getTimestamp("reviewed_at") == null ? null
                               : rs.getTimestamp("reviewed_at").toLocalDateTime().format(BR),
                           "nota", rs.getString("review_note"));
            }, Auth.orgId());
    }

    // the dashboard shows the latest 10; the history screen asks for more with ?limit=
    @GetMapping("/activity")
    public List<Map<String, Object>> activity(@RequestParam(defaultValue = "10") int limit) {
        return jdbc.query("""
            SELECT a.action, a.detail, a.created_at, u.name, a.user_id
            FROM activity_log a JOIN users u ON u.id = a.user_id
            WHERE a.organization_id = ? ORDER BY a.created_at DESC, a.id DESC LIMIT ?
            """, (rs, n) -> {
                String action = rs.getString("action");
                String icone = action.contains("evidência") ? "file"
                             : action.contains("relatório") ? "report"
                             : action.contains("pendência") ? "clip"
                             : action.contains("membro") || action.contains("pessoa") ? "users" : "chart";
                Timestamp quando = rs.getTimestamp("created_at");
                return row("icone", icone, "quem", rs.getString("name").split(" ")[0],
                           "nome", rs.getString("name"),
                           "usuarioId", rs.getInt("user_id"),
                           "acao", action,
                           "detalhe", rs.getString("detail"),
                           "quando", quando.toLocalDateTime().format(BR_HORA),
                           "det", rs.getString("detail") + " · " + tempo(quando));
            }, Auth.orgId(), Math.max(1, Math.min(limit, 500)));
    }

    @GetMapping("/organization")
    public Map<String, Object> organization() {
        return jdbc.queryForObject(
            "SELECT name, sector, esg_target FROM organizations WHERE id = ?",
            (rs, n) -> row("nome", rs.getString("name"), "setor", rs.getString("sector"),
                           "meta", rs.getInt("esg_target")),
            Auth.orgId());
    }
}