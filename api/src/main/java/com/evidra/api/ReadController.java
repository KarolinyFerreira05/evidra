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
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ReadController {

    private static final DateTimeFormatter BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

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

    private static String cat(String c) {
        return switch (c) {
            case "ambiental" -> "Ambiental";
            case "social" -> "Social";
            default -> "Governança";
        };
    }

    private static String sigla(String nome) {
        StringBuilder s = new StringBuilder();
        for (String p : nome.split(" ")) if (s.length() < 2 && !p.isEmpty()) s.append(p.charAt(0));
        return s.toString().toUpperCase();
    }

    private static String tempo(Timestamp t) {
        long h = ChronoUnit.HOURS.between(t.toLocalDateTime(), LocalDateTime.now());
        if (h < 1) return "agora";
        if (h < 24) return "há " + h + "h";
        long d = h / 24;
        return d == 1 ? "ontem" : "há " + d + " dias";
    }

    @GetMapping("/users")
    public List<Map<String, Object>> users() {
        return jdbc.query(
            "SELECT name, job_title, focus_category FROM users WHERE organization_id = ? ORDER BY id",
            (rs, n) -> row("sigla", sigla(rs.getString("name")), "nome", rs.getString("name"),
                           "cargo", rs.getString("job_title"), "cat", cat(rs.getString("focus_category"))),
            Auth.orgId());
    }

    @GetMapping("/evidence")
    public List<Map<String, Object>> evidence() {
        return jdbc.query("""
            SELECT e.file_name, e.status, e.uploaded_at, i.name AS indicator, u.name AS uploader
            FROM evidence e
            LEFT JOIN indicators i ON i.id = e.indicator_id
            JOIN users u ON u.id = e.uploaded_by
            WHERE e.organization_id = ?
            ORDER BY e.uploaded_at DESC
            """, (rs, n) -> {
                String ind = rs.getString("indicator");
                String st = switch (rs.getString("status")) {
                    case "aprovada" -> "Aprovada";
                    case "rejeitada" -> "Rejeitada";
                    default -> "Em análise";
                };
                return row("nome", rs.getString("file_name"),
                           "ind", ind != null ? ind : "Sem indicador vinculado",
                           "quem", rs.getString("uploader"),
                           "data", rs.getTimestamp("uploaded_at").toLocalDateTime().format(BR),
                           "status", st);
            }, Auth.orgId());
    }

    @GetMapping("/tasks")
    public List<Map<String, Object>> tasks() {
        return jdbc.query("""
            SELECT t.id, t.description, t.due_date, t.priority, t.done, u.name AS assignee
            FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
            WHERE t.organization_id = ? ORDER BY t.id
            """, (rs, n) -> {
                java.sql.Date due = rs.getDate("due_date");
                String assignee = rs.getString("assignee");
                String prio = switch (rs.getString("priority")) {
                    case "alta" -> "Alta";
                    case "baixa" -> "Baixa";
                    default -> "Média";
                };
                return row("id", rs.getInt("id"), "texto", rs.getString("description"),
                           "quem", assignee != null ? assignee : "—",
                           "Prazo", due != null ? due.toLocalDate().format(BR) : "—",
                           "prio", prio, "feita", rs.getBoolean("done"));
            }, Auth.orgId());
    }

    @GetMapping("/reports")
    public List<Map<String, Object>> reports() {
        return jdbc.query(
            "SELECT name, status, created_at FROM reports WHERE organization_id = ? ORDER BY created_at DESC",
            (rs, n) -> row("nome", rs.getString("name"),
                           "data", rs.getTimestamp("created_at").toLocalDateTime().format(BR),
                           "status", "publicado".equals(rs.getString("status")) ? "Publicado" : "Rascunho"),
            Auth.orgId());
    }

    @GetMapping("/activity")
    public List<Map<String, Object>> activity() {
        return jdbc.query("""
            SELECT a.action, a.detail, a.created_at, u.name
            FROM activity_log a JOIN users u ON u.id = a.user_id
            WHERE a.organization_id = ? ORDER BY a.created_at DESC LIMIT 10
            """, (rs, n) -> {
                String action = rs.getString("action");
                String icone = action.contains("evidência") ? "file"
                             : action.contains("relatório") ? "report" : "chart";
                return row("icone", icone, "quem", rs.getString("name").split(" ")[0],
                           "acao", action,
                           "det", rs.getString("detail") + " · " + tempo(rs.getTimestamp("created_at")));
            }, Auth.orgId());
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