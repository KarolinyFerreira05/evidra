package com.evidra.api;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.boot.json.JsonWriter;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Reports are snapshots: POST /reports freezes, for a period, every active indicator's value,
 * status and evidence into reports.content (JSON), so the report never changes afterwards.
 */
@RestController
public class ReportController {

    private static final DateTimeFormatter BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter BR_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final ZoneId ZONA = ZoneId.of("America/Sao_Paulo");
    static final Map<String, String> MODELOS = Map.of(
        "mensal", "Relatório mensal", "semestral", "Relatório parcial/semestral",
        "anual", "Relatório anual", "intervalo", "Intervalo definido");

    private final JdbcTemplate jdbc;

    public ReportController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o).strip();
    }

    private void registrar(String acao, String detalhe) {
        jdbc.update("INSERT INTO activity_log (organization_id, user_id, action, detail) VALUES (?, ?, ?, ?)",
            Auth.orgId(), Auth.userId(), acao, detalhe.length() > 255 ? detalhe.substring(0, 254) + "…" : detalhe);
    }

    /** "09/2026", "1º semestre de 2026", "2026" or "01/03/2026 a 15/04/2026". */
    static String textoPeriodo(String modelo, LocalDate inicio, LocalDate fim) {
        if (modelo == null || inicio == null || fim == null) return "—";
        return switch (modelo) {
            case "mensal" -> String.format("%02d/%d", inicio.getMonthValue(), inicio.getYear());
            case "semestral" -> (inicio.getMonthValue() <= 6 ? "1º" : "2º") + " semestre de " + inicio.getYear();
            case "anual" -> String.valueOf(inicio.getYear());
            default -> inicio.format(BR) + " a " + fim.format(BR);
        };
    }

    // ?arquivados=true lists only the archived ones
    @GetMapping("/reports")
    public List<Map<String, Object>> list(@RequestParam(value = "arquivados", defaultValue = "false") boolean arquivados) {
        return jdbc.query("""
            SELECT id, name, status, created_at, template, period_start, period_end, content IS NOT NULL AS has_content
            FROM reports WHERE organization_id = ? AND archived = ? ORDER BY created_at DESC, id DESC
            """, (rs, n) -> {
                String modelo = rs.getString("template");
                java.sql.Date ini = rs.getDate("period_start"), fim = rs.getDate("period_end");
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getInt("id"));
                m.put("nome", rs.getString("name"));
                m.put("data", rs.getTimestamp("created_at").toLocalDateTime().format(BR));
                m.put("status", "publicado".equals(rs.getString("status")) ? "Publicado" : "Rascunho");
                m.put("modelo", modelo);
                m.put("modeloNome", modelo == null ? null : MODELOS.get(modelo));
                m.put("periodo", textoPeriodo(modelo, ini == null ? null : ini.toLocalDate(), fim == null ? null : fim.toLocalDate()));
                m.put("temConteudo", rs.getBoolean("has_content"));
                return m;
            }, Auth.orgId(), arquivados);
    }

    // archiving hides a report from the list; it is never deleted, and can be restored
    @PostMapping("/reports/{id}/archive")
    public ResponseEntity<?> arquivar(@PathVariable int id) {
        return mudarArquivado(id, true);
    }

    @PostMapping("/reports/{id}/restore")
    public ResponseEntity<?> restaurar(@PathVariable int id) {
        return mudarArquivado(id, false);
    }

    private ResponseEntity<?> mudarArquivado(int id, boolean arquivar) {
        Auth.exigir(Auth.RESPONSAVEL, Auth.AUDITOR);
        List<String> nome = jdbc.queryForList(
            "SELECT name FROM reports WHERE id = ? AND organization_id = ? AND archived = ?", String.class, id, Auth.orgId(), !arquivar);
        if (nome.isEmpty()) throw new ApiErro(404, arquivar ? "Relatório não encontrado." : "Relatório arquivado não encontrado.");
        jdbc.update("UPDATE reports SET archived = ? WHERE id = ? AND organization_id = ?", arquivar, id, Auth.orgId());
        registrar(arquivar ? "arquivou um relatório" : "restaurou um relatório", nome.get(0));
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // {"nome": "...", "modelo": "mensal", "inicio": "2026-09-01", "fim": "2026-09-30"}
    @PostMapping("/reports")
    public ResponseEntity<?> criar(@RequestBody Map<String, Object> body) {
        Auth.exigir(Auth.RESPONSAVEL, Auth.AUDITOR);
        int org = Auth.orgId();
        String modelo = str(body.get("modelo"));
        if (!MODELOS.containsKey(modelo)) throw new ApiErro(400, "Escolha o modelo do relatório.");
        LocalDate inicio, fim;
        try {
            inicio = LocalDate.parse(str(body.get("inicio")));
            fim = LocalDate.parse(str(body.get("fim")));
        } catch (DateTimeParseException e) {
            throw new ApiErro(400, "Informe o período do relatório.");
        }
        if (fim.isBefore(inicio)) throw new ApiErro(400, "O fim do período não pode ser antes do início.");
        if (inicio.plusYears(10).isBefore(fim)) throw new ApiErro(400, "O período pode ter no máximo 10 anos.");
        // the model must match the dates, so the period text is always true
        boolean coerente = switch (modelo) {
            case "mensal" -> inicio.getDayOfMonth() == 1 && fim.equals(inicio.with(TemporalAdjusters.lastDayOfMonth()));
            case "semestral" -> (inicio.getMonthValue() == 1 || inicio.getMonthValue() == 7) && inicio.getDayOfMonth() == 1
                && fim.equals(inicio.plusMonths(5).with(TemporalAdjusters.lastDayOfMonth()));
            case "anual" -> inicio.getDayOfYear() == 1 && fim.equals(inicio.with(TemporalAdjusters.lastDayOfYear()));
            default -> true;
        };
        if (!coerente) throw new ApiErro(400, "O período não corresponde ao modelo escolhido.");

        String nome = str(body.get("nome"));
        if (nome.isEmpty()) nome = MODELOS.get(modelo) + " – " + textoPeriodo(modelo, inicio, fim);
        if (nome.length() > 200) throw new ApiErro(400, "O nome pode ter no máximo 200 caracteres.");

        String conteudo = JsonWriter.standard().writeToString(snapshot(org, nome, modelo, inicio, fim));
        jdbc.update("""
            INSERT INTO reports (organization_id, name, template, period_start, period_end, content)
            VALUES (?, ?, ?, ?, ?, ?)
            """, org, nome, modelo, inicio, fim, conteudo);
        registrar("criou um relatório", nome);
        return ResponseEntity.status(201).body(Map.of("ok", true));
    }

    private Map<String, Object> snapshot(int org, String nome, String modelo, LocalDate inicio, LocalDate fim) {
        Map<String, Object> organizacao = jdbc.queryForObject(
            "SELECT name, sector FROM organizations WHERE id = ?", (rs, n) -> {
                Map<String, Object> o = new LinkedHashMap<>();
                o.put("nome", rs.getString("name"));
                o.put("setor", rs.getString("sector"));
                return o;
            }, org);
        String autor = jdbc.queryForObject("SELECT name FROM users WHERE id = ?", String.class, Auth.userId());

        // status and progress exactly as the cards show them now (same rules as GET /indicators)
        Map<Integer, Map<String, Object>> atuais = new LinkedHashMap<>();
        for (Map<String, Object> i : new IndicatorController(jdbc).list()) atuais.put((Integer) i.get("id"), i);

        List<Map<String, Object>> indicadores = new ArrayList<>();
        int comDado = 0, comAprovada = 0;
        for (Map<String, Object> i : atuais.values()) {
            int id = (Integer) i.get("id");
            // latest value whose reference date falls inside the period
            List<Map<String, Object>> reg = jdbc.queryForList("""
                SELECT value, period FROM indicator_records
                WHERE indicator_id = ? AND period BETWEEN ? AND ?
                ORDER BY period DESC, created_at DESC, id DESC LIMIT 1
                """, id, inicio, fim);
            List<Map<String, Object>> evidencias = jdbc.query("""
                SELECT file_name, status FROM evidence WHERE indicator_id = ? AND organization_id = ? ORDER BY uploaded_at, id
                """, (rs, n) -> {
                    Map<String, Object> e = new LinkedHashMap<>();
                    e.put("nome", rs.getString("file_name"));
                    e.put("status", switch (rs.getString("status")) {
                        case "aprovada" -> "Aprovada";
                        case "rejeitada" -> "Rejeitada";
                        default -> "Em análise";
                    });
                    return e;
                }, id, org);

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("nome", i.get("nome"));
            m.put("pilar", i.get("cat"));
            m.put("responsavel", i.get("dono"));
            if (reg.isEmpty()) {
                m.put("valor", "Sem dado no período");
                m.put("dataValor", null);
                m.put("semDado", true);
            } else {
                m.put("valor", IndicatorController.valorComUnidade((java.math.BigDecimal) reg.get(0).get("value"), (String) i.get("unidade")));
                Object p = reg.get(0).get("period");
                m.put("dataValor", (p instanceof java.sql.Date d ? d.toLocalDate() : (LocalDate) p).format(BR));
                m.put("semDado", false);
                comDado++;
            }
            m.put("status", i.get("status"));
            m.put("progresso", i.get("prog"));
            m.put("evidencias", evidencias);
            if (evidencias.stream().anyMatch(e -> "Aprovada".equals(e.get("status")))) comAprovada++;
            indicadores.add(m);
        }

        Map<String, Object> periodo = new LinkedHashMap<>();
        periodo.put("inicio", inicio.format(BR));
        periodo.put("fim", fim.format(BR));
        periodo.put("texto", textoPeriodo(modelo, inicio, fim));
        Map<String, Object> resumo = new LinkedHashMap<>();
        resumo.put("indicadores", indicadores.size());
        resumo.put("comDado", comDado);
        resumo.put("comEvidenciaAprovada", comAprovada);

        Map<String, Object> s = new LinkedHashMap<>();
        s.put("nome", nome);
        s.put("modelo", modelo);
        s.put("modeloNome", MODELOS.get(modelo));
        s.put("organizacao", organizacao);
        s.put("periodo", periodo);
        s.put("geradoEm", LocalDateTime.now(ZONA).format(BR_HORA));
        s.put("geradoPor", autor);
        s.put("resumo", resumo);
        s.put("indicadores", indicadores);
        return s;
    }

    @GetMapping("/reports/{id}")
    public ResponseEntity<String> snapshot(@PathVariable int id) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT content, status FROM reports WHERE id = ? AND organization_id = ?", id, Auth.orgId());
        if (rows.isEmpty()) throw new ApiErro(404, "Relatório não encontrado.");
        String conteudo = (String) rows.get(0).get("content");
        if (conteudo == null) throw new ApiErro(404, "Este relatório foi criado antes dos relatórios com dados e não tem conteúdo.");
        // the stored snapshot plus the current status (publishing happens after generation)
        String status = "publicado".equals(rows.get(0).get("status")) ? "Publicado" : "Rascunho";
        String json = conteudo.substring(0, conteudo.lastIndexOf('}')) + ",\"status\":\"" + status + "\"}";
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(json);
    }

    @PostMapping("/reports/{id}/publish")
    public ResponseEntity<?> publicar(@PathVariable int id) {
        Auth.exigir(Auth.AUDITOR); // admin or auditor: whoever generated the draft is not necessarily who signs it off
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT name, status, content IS NOT NULL AS has_content FROM reports WHERE id = ? AND organization_id = ?", id, Auth.orgId());
        if (rows.isEmpty()) throw new ApiErro(404, "Relatório não encontrado.");
        if ("publicado".equals(rows.get(0).get("status"))) throw new ApiErro(409, "Este relatório já foi publicado.");
        Object tem = rows.get(0).get("has_content");
        if (!(Boolean.TRUE.equals(tem) || Long.valueOf(1).equals(tem) || Integer.valueOf(1).equals(tem)))
            throw new ApiErro(400, "Relatórios sem conteúdo não podem ser publicados.");
        jdbc.update("UPDATE reports SET status = 'publicado' WHERE id = ? AND organization_id = ? AND status = 'rascunho'", id, Auth.orgId());
        registrar("publicou um relatório", (String) rows.get(0).get("name"));
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
