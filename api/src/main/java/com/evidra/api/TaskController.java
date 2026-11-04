package com.evidra.api;

import java.sql.Timestamp;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Manual tasks live in the tasks table and can be created, edited, ticked and deleted.
 * System tasks are computed on every GET from the current state (outdated indicators,
 * evidence waiting for review), have string ids like "sys-ind-5", and are read-only:
 * they disappear by themselves once the cause is fixed.
 */
@RestController
@RequestMapping("/tasks")
public class TaskController {

    private static final DateTimeFormatter BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    // "today" for deadlines is the users' day, not the server's (the host runs in UTC)
    private static final ZoneId ZONA = ZoneId.of("America/Sao_Paulo");
    private static final Set<String> PRIORIDADES = Set.of("alta", "media", "baixa");
    private static final String MSG_SISTEMA = "Pendências do sistema não podem ser alteradas. Elas somem quando o problema é resolvido.";

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

    private void registrar(String acao, String detalhe) {
        jdbc.update("INSERT INTO activity_log (organization_id, user_id, action, detail) VALUES (?, ?, ?, ?)",
            Auth.orgId(), Auth.userId(), acao, detalhe.length() > 255 ? detalhe.substring(0, 254) + "…" : detalhe);
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        int org = Auth.orgId();
        LocalDate hoje = LocalDate.now(ZONA);
        List<Map<String, Object>> out = new ArrayList<>();

        out.addAll(jdbc.query("""
            SELECT t.id, t.description, t.due_date, t.priority, t.done, t.assignee_id, t.indicator_id, u.name AS assignee
            FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
            WHERE t.organization_id = ? AND t.origin = 'manual' ORDER BY t.id
            """, (rs, n) -> {
                java.sql.Date due = rs.getDate("due_date");
                return tarefa(rs.getInt("id"), rs.getString("description"), rs.getString("assignee"),
                    due != null ? due.toLocalDate() : null, rs.getString("priority"), rs.getBoolean("done"), "manual",
                    rs.getObject("indicator_id", Integer.class), rs.getObject("assignee_id", Integer.class));
            }, org));

        // one per indicator whose latest record is missing or older than its update frequency;
        // "older" is measured exactly like the "Desatualizado" status in IndicatorController
        jdbc.query("""
            SELECT i.id, i.name, i.update_frequency_days, i.owner_id, u.name AS owner,
                   (SELECT MAX(created_at) FROM indicator_records r WHERE r.indicator_id = i.id) AS last_update
            FROM indicators i LEFT JOIN users u ON u.id = i.owner_id
            WHERE i.organization_id = ? AND i.archived = FALSE ORDER BY i.id
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

    private record Dados(String titulo, Integer indicadorId, int responsavelId, LocalDate prazo, String prio) {}

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o).strip();
    }

    private static Integer inteiro(Object o, String campo) {
        String s = str(o);
        if (s.isEmpty()) return null;
        try {
            return Integer.valueOf(s);
        } catch (NumberFormatException e) {
            throw new ApiErro(400, campo + " inválido.");
        }
    }

    // prazoAtual: on edit, an already-past deadline may be kept as it is
    private Dados validar(Map<String, Object> body, LocalDate prazoAtual, Integer responsavelAtual) {
        int org = Auth.orgId();
        String titulo = str(body.get("titulo")).replaceAll("\\p{Cntrl}", " ");
        if (titulo.isEmpty()) throw new ApiErro(400, "Informe o título.");
        if (titulo.length() > 255) throw new ApiErro(400, "O título pode ter no máximo 255 caracteres.");

        Integer indicadorId = inteiro(body.get("indicadorId"), "Indicador");
        if (indicadorId != null && jdbc.queryForObject(
                "SELECT COUNT(*) FROM indicators WHERE id = ? AND organization_id = ? AND archived = FALSE", Integer.class, indicadorId, org) == 0)
            throw new ApiErro(400, "Indicador não encontrado.");

        Integer responsavelId = inteiro(body.get("responsavelId"), "Responsável");
        if (responsavelId == null) throw new ApiErro(400, "Escolha um responsável.");
        if (jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE id = ? AND organization_id = ?", Integer.class, responsavelId, org) == 0)
            throw new ApiErro(400, "Responsável não encontrado.");
        if (!responsavelId.equals(responsavelAtual) && jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE id = ? AND active = TRUE", Integer.class, responsavelId) == 0)
            throw new ApiErro(400, "Este membro está inativo. Escolha um responsável ativo.");

        LocalDate prazo;
        try {
            prazo = LocalDate.parse(str(body.get("prazo")));
        } catch (DateTimeParseException e) {
            throw new ApiErro(400, "Informe um prazo válido.");
        }
        if (prazo.isBefore(LocalDate.now(ZONA)) && !prazo.equals(prazoAtual))
            throw new ApiErro(400, "O prazo não pode estar no passado.");

        String prio = Normalizer.normalize(str(body.get("prio")), Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "").toLowerCase();
        if (!PRIORIDADES.contains(prio)) throw new ApiErro(400, "Escolha a prioridade.");
        return new Dados(titulo, indicadorId, responsavelId, prazo, prio);
    }

    private record Manual(int id, String titulo, LocalDate prazo, Integer responsavel) {}

    // finds a manual task of the user's organization, or answers 403 (system) / 404 (missing)
    private Manual manual(String id) {
        if (id.startsWith("sys-")) throw new ApiErro(403, MSG_SISTEMA);
        int num;
        try {
            num = Integer.parseInt(id);
        } catch (NumberFormatException e) {
            throw new ApiErro(404, "Pendência não encontrada.");
        }
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT description, due_date, origin, assignee_id FROM tasks WHERE id = ? AND organization_id = ?", num, Auth.orgId());
        if (rows.isEmpty()) throw new ApiErro(404, "Pendência não encontrada.");
        Map<String, Object> r = rows.get(0);
        if (!"manual".equals(r.get("origin"))) throw new ApiErro(403, MSG_SISTEMA);
        Object due = r.get("due_date");
        LocalDate prazo = due instanceof java.sql.Date d ? d.toLocalDate() : due instanceof LocalDate l ? l : null;
        Object resp = r.get("assignee_id");
        return new Manual(num, (String) r.get("description"), prazo, resp == null ? null : ((Number) resp).intValue());
    }

    @PostMapping
    public ResponseEntity<?> criar(@RequestBody Map<String, Object> body) {
        Auth.exigir(Auth.RESPONSAVEL);
        Dados d = validar(body, null, null);
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            var ps = con.prepareStatement("""
                INSERT INTO tasks (organization_id, description, assignee_id, indicator_id, due_date, priority, origin)
                VALUES (?, ?, ?, ?, ?, ?, 'manual')
                """, java.sql.Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, Auth.orgId());
            ps.setString(2, d.titulo());
            ps.setInt(3, d.responsavelId());
            ps.setObject(4, d.indicadorId());
            ps.setObject(5, d.prazo());
            ps.setString(6, d.prio());
            return ps;
        }, kh);
        registrar("criou uma pendência", d.titulo());
        return ResponseEntity.status(201).body(Map.of("id", kh.getKey().intValue()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> editar(@PathVariable String id, @RequestBody Map<String, Object> body) {
        Auth.exigir(Auth.RESPONSAVEL);
        Manual t = manual(id);
        Dados d = validar(body, t.prazo(), t.responsavel());
        jdbc.update("""
            UPDATE tasks SET description = ?, assignee_id = ?, indicator_id = ?, due_date = ?, priority = ?
            WHERE id = ? AND organization_id = ?
            """, d.titulo(), d.responsavelId(), d.indicadorId(), d.prazo(), d.prio(), t.id(), Auth.orgId());
        registrar("editou uma pendência", d.titulo());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> excluir(@PathVariable String id) {
        Auth.exigir(Auth.RESPONSAVEL);
        Manual t = manual(id);
        jdbc.update("DELETE FROM tasks WHERE id = ? AND organization_id = ?", t.id(), Auth.orgId());
        registrar("excluiu uma pendência", t.titulo());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ticks / unticks a manual task
    @PatchMapping("/{id}")
    public ResponseEntity<?> concluir(@PathVariable String id, @RequestBody Map<String, Object> body) {
        Auth.exigir(Auth.RESPONSAVEL);
        Manual t = manual(id);
        boolean done = Boolean.TRUE.equals(body.get("done"));
        jdbc.update("UPDATE tasks SET done = ? WHERE id = ? AND organization_id = ?", done, t.id(), Auth.orgId());
        registrar(done ? "concluiu uma pendência" : "reabriu uma pendência", t.titulo());
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
