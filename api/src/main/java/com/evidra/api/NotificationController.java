package com.evidra.api;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The bell: always the logged-in user's own notifications and preferences. */
@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private static final DateTimeFormatter BR_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final JdbcTemplate jdbc;
    private final NotificationService notificacoes;

    public NotificationController(JdbcTemplate jdbc, NotificationService notificacoes) {
        this.jdbc = jdbc;
        this.notificacoes = notificacoes;
    }

    private record Vencido(int id, String nome) {}

    // "outdated" is measured exactly like the pendências in TaskController; there is no scheduler, this runs on each GET
    private void gerarDesatualizados() {
        int org = Auth.orgId(), eu = Auth.userId();
        List<Vencido> vencidos = new ArrayList<>();
        jdbc.query("""
            SELECT i.id, i.name, i.update_frequency_days,
                   (SELECT MAX(created_at) FROM indicator_records r WHERE r.indicator_id = i.id) AS last_update
            FROM indicators i
            WHERE i.organization_id = ? AND i.owner_id = ? AND i.archived = FALSE AND i.in_review = FALSE
            """, rs -> {
                Timestamp last = rs.getTimestamp("last_update");
                if (last != null && ChronoUnit.DAYS.between(last.toLocalDateTime(), LocalDateTime.now())
                        <= rs.getInt("update_frequency_days")) return;
                vencidos.add(new Vencido(rs.getInt("id"), rs.getString("name")));
            }, org, eu);
        if (vencidos.isEmpty()) return;

        // no new warning while one is unread, nor within 7 days of the last one, even if it was already read
        Set<Integer> jaAvisados = new HashSet<>(jdbc.queryForList("""
            SELECT indicator_id FROM notifications
            WHERE user_id = ? AND organization_id = ? AND type = ? AND indicator_id IS NOT NULL
              AND (read_at IS NULL OR created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))
            """, Integer.class, eu, org, NotificationService.INDICADOR_DESATUALIZADO));
        for (Vencido v : vencidos) {
            if (jaAvisados.contains(v.id())) continue;
            notificacoes.notificar(NotificationService.INDICADOR_DESATUALIZADO, "Indicador desatualizado: " + v.nome(),
                v.id(), null, null, eu);
        }
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        gerarDesatualizados();
        return jdbc.query("""
            SELECT id, type, message, indicator_id, evidence_id, report_id, read_at, created_at
            FROM notifications WHERE user_id = ? AND organization_id = ?
            ORDER BY created_at DESC, id DESC
            """, (rs, n) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getInt("id"));
                m.put("tipo", rs.getString("type"));
                m.put("titulo", rs.getString("message"));
                m.put("det", rs.getTimestamp("created_at").toLocalDateTime().format(BR_HORA));
                m.put("lida", rs.getTimestamp("read_at") != null);
                m.put("indicadorId", rs.getObject("indicator_id", Integer.class));
                m.put("evidenciaId", rs.getObject("evidence_id", Integer.class));
                m.put("relatorioId", rs.getObject("report_id", Integer.class));
                return m;
            }, Auth.userId(), Auth.orgId());
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> ler(@PathVariable int id) {
        jdbc.update("UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ? AND organization_id = ? AND read_at IS NULL",
            id, Auth.userId(), Auth.orgId());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/read-all")
    public ResponseEntity<?> lerTodas() {
        jdbc.update("UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND organization_id = ? AND read_at IS NULL",
            Auth.userId(), Auth.orgId());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // every type with its state; no row means on
    @GetMapping("/preferences")
    public Map<String, Boolean> preferencias() {
        Map<String, Boolean> out = new LinkedHashMap<>();
        NotificationService.TIPOS.forEach(t -> out.put(t, true));
        jdbc.query("SELECT type, enabled FROM notification_preferences WHERE user_id = ?",
            rs -> { out.put(rs.getString("type"), rs.getBoolean("enabled")); }, Auth.userId());
        return out;
    }

    // {"tipo": "evidencia_aprovada", "ativo": false}
    @PostMapping("/preferences")
    public ResponseEntity<?> salvarPreferencia(@RequestBody Map<String, Object> body) {
        if (!(body.get("tipo") instanceof String tipo) || !NotificationService.TIPOS.contains(tipo))
            throw new ApiErro(400, "Tipo de notificação inválido.");
        if (!(body.get("ativo") instanceof Boolean ativo)) throw new ApiErro(400, "Informe se o tipo fica ligado.");
        jdbc.update("""
            INSERT INTO notification_preferences (user_id, type, enabled) VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)
            """, Auth.userId(), tipo, ativo);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
