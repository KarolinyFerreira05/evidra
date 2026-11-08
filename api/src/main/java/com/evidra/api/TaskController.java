package com.evidra.api;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Pendências are computed on every GET from the current state (outdated indicators,
 * evidence waiting for review), have string ids like "sys-ind-5", and are read-only:
 * they disappear by themselves once the cause is fixed.
 */
@RestController
@RequestMapping("/tasks")
public class TaskController {

    private static final DateTimeFormatter BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    // "today" for deadlines is the users' day, not the server's (the host runs in UTC)
    private static final ZoneId ZONA = ZoneId.of("America/Sao_Paulo");

    private final JdbcTemplate jdbc;

    public TaskController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static Map<String, Object> tarefa(Object id, String texto, String quem, LocalDate prazo, String prio,
                                              boolean feita, String origem, Integer indicadorId, Integer responsavelId) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("texto", texto);
        m.put("quem", quem != null ? quem : "—");
        m.put("Prazo", prazo != null ? prazo.format(BR) : "—");
        m.put("prio", switch (prio) { case "alta" -> "Alta"; case "baixa" -> "Baixa"; default -> "Média"; });
        m.put("feita", feita);
        m.put("origem", origem);
        m.put("indicadorId", indicadorId);
        m.put("responsavelId", responsavelId);
        return m;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        int org = Auth.orgId();
        LocalDate hoje = LocalDate.now(ZONA);
        List<Map<String, Object>> out = new ArrayList<>();

        // one per indicator not in review whose latest record is missing or older than its update frequency;
        // "older" is measured exactly like the "Desatualizado" status in IndicatorController
        jdbc.query("""
            SELECT i.id, i.name, i.update_frequency_days, i.owner_id, u.name AS owner,
                   (SELECT MAX(created_at) FROM indicator_records r WHERE r.indicator_id = i.id) AS last_update
            FROM indicators i LEFT JOIN users u ON u.id = i.owner_id
            WHERE i.organization_id = ? AND i.archived = FALSE AND i.in_review = FALSE ORDER BY i.id
            """, rs -> {
                Timestamp last = rs.getTimestamp("last_update");
                int freq = rs.getInt("update_frequency_days");
                if (last != null && ChronoUnit.DAYS.between(last.toLocalDateTime(), LocalDateTime.now()) <= freq) return;
                LocalDate prazo = last == null ? null : last.toLocalDateTime().toLocalDate().plusDays(freq);
                boolean atrasada = prazo == null || prazo.isBefore(hoje); // never measured counts as overdue
                out.add(tarefa("sys-ind-" + rs.getInt("id"), "Atualizar " + rs.getString("name"), rs.getString("owner"),
                    prazo, atrasada ? "alta" : "media", false, "sistema",
                    rs.getInt("id"), rs.getObject("owner_id", Integer.class)));
            }, org);

        // one per evidence still in review; the linked indicator's owner is the natural reviewer
        jdbc.query("""
            SELECT e.id, e.file_name, e.indicator_id, i.owner_id, u.name AS owner
            FROM evidence e
            LEFT JOIN indicators i ON i.id = e.indicator_id
            LEFT JOIN users u ON u.id = i.owner_id
            WHERE e.organization_id = ? AND e.status = 'em_analise' ORDER BY e.uploaded_at, e.id
            """, rs -> {
                out.add(tarefa("sys-ev-" + rs.getInt("id"), "Revisar evidência " + rs.getString("file_name"),
                    rs.getString("owner"), null, "media", false, "sistema",
                    rs.getObject("indicator_id", Integer.class), rs.getObject("owner_id", Integer.class)));
            }, org);
        return out;
    }
}
