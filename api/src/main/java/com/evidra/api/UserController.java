package com.evidra.api;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Team members. They are deactivated, never deleted, because history refers to them. */
@RestController
@RequestMapping("/users")
public class UserController {

    private final JdbcTemplate jdbc;

    public UserController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o).strip();
    }

    private static String sigla(String nome) {
        StringBuilder s = new StringBuilder();
        for (String p : nome.split(" ")) if (s.length() < 2 && !p.isEmpty()) s.append(p.charAt(0));
        return s.toString().toUpperCase();
    }

    private static String cat(String c) {
        return switch (c) {
            case "ambiental" -> "Ambiental";
            case "social" -> "Social";
            default -> "Governança";
        };
    }

    private void registrar(String acao, String detalhe) {
        jdbc.update("INSERT INTO activity_log (organization_id, user_id, action, detail) VALUES (?, ?, ?, ?)",
            Auth.orgId(), Auth.userId(), acao, detalhe.length() > 255 ? detalhe.substring(0, 254) + "…" : detalhe);
    }

    // what a member still holds; deactivating them requires handing this over
    private static final String INDICADORES_DONO = "SELECT COUNT(*) FROM indicators WHERE owner_id = ? AND organization_id = ? AND archived = FALSE";
    private static final String PENDENCIAS_ABERTAS =
        "SELECT COUNT(*) FROM tasks WHERE assignee_id = ? AND organization_id = ? AND origin = 'manual' AND done = FALSE";

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(defaultValue = "false") boolean inativos) {
        return jdbc.query("""
            SELECT u.id, u.name, u.job_title, u.focus_category, u.role, u.active, u.deactivated_at,
                   (SELECT COUNT(*) FROM indicators i WHERE i.owner_id = u.id AND i.organization_id = u.organization_id AND i.archived = FALSE) AS indicadores,
                   (SELECT COUNT(*) FROM tasks t WHERE t.assignee_id = u.id AND t.organization_id = u.organization_id
                       AND t.origin = 'manual' AND t.done = FALSE) AS pendencias
            FROM users u
            WHERE u.organization_id = ? AND (u.active = TRUE OR ?)
            ORDER BY u.active DESC, u.id
            """, (rs, n) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getInt("id"));
                m.put("sigla", sigla(rs.getString("name")));
                m.put("nome", rs.getString("name"));
                m.put("role", rs.getString("role"));
                m.put("cargo", rs.getString("job_title"));
                m.put("cat", cat(rs.getString("focus_category")));
                m.put("ativo", rs.getBoolean("active"));
                var desde = rs.getTimestamp("deactivated_at");
                m.put("desativadoEm", desde == null ? null : desde.toLocalDateTime().toLocalDate().toString());
                m.put("indicadores", rs.getInt("indicadores"));
                m.put("pendencias", rs.getInt("pendencias"));
                return m;
            }, Auth.orgId(), inativos);
    }

    private static final java.time.format.DateTimeFormatter BR_HORA = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    // details of one member for the Equipe screen: admin only, since it exposes e-mail and activity
    @GetMapping("/{id}")
    public Map<String, Object> detalhes(@PathVariable int id) {
        Auth.exigir();
        int org = Auth.orgId();
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT name, email, job_title, focus_category, role, active, deactivated_at FROM users WHERE id = ? AND organization_id = ?", id, org);
        if (rows.isEmpty()) throw new ApiErro(404, "Membro não encontrado.");
        Map<String, Object> u = rows.get(0);

        Map<String, Object> ev = jdbc.queryForMap("""
            SELECT COUNT(*) AS total,
                   COALESCE(SUM(status = 'aprovada'), 0) AS aprovadas,
                   COALESCE(SUM(status = 'rejeitada'), 0) AS rejeitadas,
                   COALESCE(SUM(status = 'em_analise'), 0) AS em_analise
            FROM evidence WHERE uploaded_by = ? AND organization_id = ?
            """, id, org);
        int revisadas = jdbc.queryForObject(
            "SELECT COUNT(*) FROM evidence WHERE reviewed_by = ? AND organization_id = ?", Integer.class, id, org);
        int registros = jdbc.queryForObject("""
            SELECT COUNT(*) FROM indicator_records r JOIN indicators i ON i.id = r.indicator_id
            WHERE r.entered_by = ? AND i.organization_id = ?
            """, Integer.class, id, org);
        List<Map<String, Object>> atividade = jdbc.query("""
            SELECT action, detail, created_at FROM activity_log
            WHERE user_id = ? AND organization_id = ? ORDER BY created_at DESC, id DESC LIMIT 8
            """, (rs, n) -> {
                Map<String, Object> a = new LinkedHashMap<>();
                a.put("acao", rs.getString("action"));
                a.put("detalhe", rs.getString("detail"));
                a.put("quando", rs.getTimestamp("created_at").toLocalDateTime().format(BR_HORA));
                return a;
            }, id, org);

        Map<String, Object> evidencias = new LinkedHashMap<>();
        evidencias.put("total", ((Number) ev.get("total")).intValue());
        evidencias.put("aprovadas", ((Number) ev.get("aprovadas")).intValue());
        evidencias.put("rejeitadas", ((Number) ev.get("rejeitadas")).intValue());
        evidencias.put("emAnalise", ((Number) ev.get("em_analise")).intValue());

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("nome", u.get("name"));
        m.put("email", u.get("email"));
        m.put("cargo", u.get("job_title"));
        m.put("cat", u.get("focus_category") == null ? null : cat((String) u.get("focus_category")));
        m.put("role", u.get("role"));
        m.put("ativo", Boolean.TRUE.equals(u.get("active")) || Integer.valueOf(1).equals(u.get("active")));
        Object desde = u.get("deactivated_at");
        m.put("desativadoEm", desde instanceof java.time.LocalDateTime d ? d.format(BR_HORA)
            : desde instanceof java.sql.Timestamp t ? t.toLocalDateTime().format(BR_HORA) : null);
        m.put("evidencias", evidencias);
        m.put("revisoes", revisadas);
        m.put("registros", registros);
        m.put("ultimaAtividade", atividade.isEmpty() ? null : atividade.get(0).get("quando"));
        m.put("atividade", atividade);
        return m;
    }

    @PostMapping
    public ResponseEntity<?> convidar(@RequestBody Map<String, Object> body) {
        Auth.exigir(); // team management: admin only
        String nome = str(body.get("nome"));
        String email = str(body.get("email")).toLowerCase();
        if (nome.isEmpty() || !email.matches("^\\S+@\\S+\\.\\S+$"))
            throw new ApiErro(400, "Informe nome e um e-mail válido.");
        String role = str(body.get("role")).isEmpty() ? Auth.RESPONSAVEL : str(body.get("role"));
        if (!Auth.NOMES.containsKey(role)) throw new ApiErro(400, "Perfil inválido.");
        try {
            jdbc.update("""
                INSERT INTO users (organization_id, name, email, password_hash, job_title, focus_category, role)
                VALUES (?, ?, ?, 'TEMP', 'Convidado(a)', 'social', ?)
                """, Auth.orgId(), nome, email, role);
        } catch (DuplicateKeyException e) {
            boolean inativo = !jdbc.queryForList(
                "SELECT id FROM users WHERE email = ? AND organization_id = ? AND active = FALSE", Integer.class, email, Auth.orgId()).isEmpty();
            throw new ApiErro(409, inativo
                ? "Este e-mail pertence a um membro inativo. Reative-o em Equipe → Inativos."
                : "Este e-mail já está cadastrado.");
        }
        registrar("convidou uma pessoa", nome);
        return ResponseEntity.status(201).body(Map.of("ok", true));
    }

    /**
     * {"ativo": false, "transferTo": 3} deactivates a member, handing their indicators and open manual tasks
     * to another active member; without transferTo, a member who still holds something gets 409 with the counts.
     * {"ativo": true} reactivates.
     */
    @PatchMapping("/{id}/active")
    @Transactional
    public ResponseEntity<?> ativo(@PathVariable int id, @RequestBody Map<String, Object> body) {
        Auth.exigir(); // team management: admin only
        int org = Auth.orgId();
        if (!(body.get("ativo") instanceof Boolean ativo)) throw new ApiErro(400, "Informe se o membro fica ativo.");

        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT name, role, active FROM users WHERE id = ? AND organization_id = ?", id, org);
        if (rows.isEmpty()) throw new ApiErro(404, "Membro não encontrado.");
        String nome = (String) rows.get(0).get("name");
        boolean atual = Boolean.TRUE.equals(rows.get(0).get("active")) || Integer.valueOf(1).equals(rows.get(0).get("active"));
        if (atual == ativo) return ResponseEntity.ok(Map.of("ok", true));

        if (ativo) {
            jdbc.update("UPDATE users SET active = TRUE, deactivated_at = NULL WHERE id = ?", id);
            registrar("reativou um membro", nome);
            return ResponseEntity.ok(Map.of("ok", true));
        }

        if (id == Auth.userId()) throw new ApiErro(400, "Você não pode desativar o seu próprio acesso.");
        if (Auth.ADMIN.equals(rows.get(0).get("role")) && jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE organization_id = ? AND role = 'admin' AND active = TRUE", Integer.class, org) <= 1)
            throw new ApiErro(400, "Não é possível desativar o último administrador ativo.");

        int indicadores = jdbc.queryForObject(INDICADORES_DONO, Integer.class, id, org);
        int pendencias = jdbc.queryForObject(PENDENCIAS_ABERTAS, Integer.class, id, org);
        Object destino = body.get("transferTo");
        String detalhe = nome;
        if (indicadores + pendencias > 0) {
            if (destino == null || str(destino).isEmpty()) {
                Map<String, Object> out = new LinkedHashMap<>();
                out.put("erro", nome + " ainda é responsável por " + indicadores + (indicadores == 1 ? " indicador" : " indicadores")
                    + " e " + pendencias + (pendencias == 1 ? " pendência aberta" : " pendências abertas")
                    + ". Escolha quem vai assumir.");
                out.put("indicadores", indicadores);
                out.put("pendencias", pendencias);
                return ResponseEntity.status(409).body(out);
            }
            int para;
            try {
                para = Integer.parseInt(str(destino));
            } catch (NumberFormatException e) {
                throw new ApiErro(400, "Membro de destino inválido.");
            }
            List<String> nomePara = jdbc.queryForList(
                "SELECT name FROM users WHERE id = ? AND organization_id = ? AND active = TRUE", String.class, para, org);
            if (para == id || nomePara.isEmpty()) throw new ApiErro(400, "Escolha um membro ativo para assumir.");
            jdbc.update("UPDATE indicators SET owner_id = ? WHERE owner_id = ? AND organization_id = ? AND archived = FALSE", para, id, org);
            jdbc.update("""
                UPDATE tasks SET assignee_id = ?
                WHERE assignee_id = ? AND organization_id = ? AND origin = 'manual' AND done = FALSE
                """, para, id, org);
            detalhe = nome + " → " + nomePara.get(0) + " assumiu " + indicadores + " ind. e " + pendencias + " pend.";
        }
        jdbc.update("UPDATE users SET active = FALSE, deactivated_at = NOW() WHERE id = ?", id);
        registrar("desativou um membro", detalhe);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
