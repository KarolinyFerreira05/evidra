package com.evidra.api;

import java.sql.PreparedStatement;
import java.sql.Statement;
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
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Reports are snapshots: POST /reports freezes, for a period, every active indicator's value,
 * status and evidence into reports.content (JSON), so the report never changes afterwards.
 */
@RestController
@RequestMapping("/reports")
public class ReportController {

    private static final DateTimeFormatter BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter BR_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final ZoneId ZONA = ZoneId.of("America/Sao_Paulo");
    static final Map<String, String> MODELOS = Map.of(
        "mensal", "Relatório mensal", "semestral", "Relatório parcial/semestral",
        "anual", "Relatório anual", "intervalo", "Intervalo definido", "auditoria", "Pacote de auditoria");
    // kinds of period; the "auditoria" model takes any of them, the others are one each
    static final List<String> TIPOS_PERIODO = List.of("mensal", "semestral", "anual", "intervalo");

    private final JdbcTemplate jdbc;
    private final NotificationService notificacoes;

    public ReportController(JdbcTemplate jdbc, NotificationService notificacoes) {
        this.jdbc = jdbc;
        this.notificacoes = notificacoes;
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
        if ("auditoria".equals(modelo)) modelo = tipoPeriodo(inicio, fim);
        return switch (modelo) {
            case "mensal" -> String.format("%02d/%d", inicio.getMonthValue(), inicio.getYear());
            case "semestral" -> (inicio.getMonthValue() <= 6 ? "1º" : "2º") + " semestre de " + inicio.getYear();
            case "anual" -> String.valueOf(inicio.getYear());
            default -> inicio.format(BR) + " a " + fim.format(BR);
        };
    }

    /** Whether the dates are exactly one month, semester or year (an "intervalo" is anything). */
    static boolean coerente(String tipo, LocalDate inicio, LocalDate fim) {
        return switch (tipo) {
            case "mensal" -> inicio.getDayOfMonth() == 1 && fim.equals(inicio.with(TemporalAdjusters.lastDayOfMonth()));
            case "semestral" -> (inicio.getMonthValue() == 1 || inicio.getMonthValue() == 7) && inicio.getDayOfMonth() == 1
                && fim.equals(inicio.plusMonths(5).with(TemporalAdjusters.lastDayOfMonth()));
            case "anual" -> inicio.getDayOfYear() == 1 && fim.equals(inicio.with(TemporalAdjusters.lastDayOfYear()));
            default -> true;
        };
    }

    // the kind of period an audit package covers, read back from its dates
    static String tipoPeriodo(LocalDate inicio, LocalDate fim) {
        return TIPOS_PERIODO.stream().filter(t -> coerente(t, inicio, fim)).findFirst().orElse("intervalo");
    }

    // ?arquivados=true lists only the archived ones
    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(defaultValue = "false") boolean arquivados) {
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
    @PostMapping("/{id}/archive")
    public ResponseEntity<?> arquivar(@PathVariable int id) {
        return mudarArquivado(id, true);
    }

    @PostMapping("/{id}/restore")
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
    // the audit package also says which kind of period it covers: {"modelo": "auditoria", "periodo": "semestral", ...}
    @PostMapping
    @Transactional // the report and its report_items are saved together or not at all
    public ResponseEntity<?> criar(@RequestBody Map<String, Object> body) {
        Auth.exigir(Auth.RESPONSAVEL, Auth.AUDITOR);
        int org = Auth.orgId();
        String modelo = str(body.get("modelo"));
        if (!MODELOS.containsKey(modelo)) throw new ApiErro(400, "Escolha o modelo do relatório.");
        String tipo = modelo;
        if (modelo.equals("auditoria")) {
            Auth.exigir(Auth.AUDITOR); // admin or auditor
            tipo = str(body.get("periodo"));
            if (!TIPOS_PERIODO.contains(tipo)) throw new ApiErro(400, "Escolha o período do pacote de auditoria.");
        }
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
        if (!coerente(tipo, inicio, fim)) throw new ApiErro(400, "O período não corresponde ao modelo escolhido.");
        // a report describes what already happened: no period may end after today
        if (fim.isAfter(LocalDate.now(ZONA)))
            throw new ApiErro(400, "Esse período termina em " + fim.format(BR) + ", depois de hoje. Escolha um período que já tenha terminado.");

        String nome = str(body.get("nome"));
        if (nome.isEmpty()) nome = MODELOS.get(modelo) + " – " + textoPeriodo(modelo, inicio, fim);
        if (nome.length() > 200) throw new ApiErro(400, "O nome pode ter no máximo 200 caracteres.");

        Map<String, Object> s = modelo.equals("auditoria")
            ? pacoteAuditoria(org, nome, inicio, fim) : snapshot(org, nome, modelo, inicio, fim);
        String conteudo = JsonWriter.standard().writeToString(s);
        String nomeSalvo = nome;
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                INSERT INTO reports (organization_id, name, template, period_start, period_end, content, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, org);
            ps.setString(2, nomeSalvo);
            ps.setString(3, modelo);
            ps.setObject(4, inicio);
            ps.setObject(5, fim);
            ps.setString(6, conteudo);
            ps.setInt(7, Auth.userId());
            return ps;
        }, kh);
        int relatorioId = kh.getKey().intValue();
        // one row per active indicator: its last record in the period or, without one, its most recent record
        jdbc.update("""
            INSERT INTO report_items (report_id, indicator_id, record_id, value_snapshot, evidence_count)
            SELECT ?, i.id, reg.id, reg.value,
                   (SELECT COUNT(*) FROM evidence e WHERE e.indicator_id = i.id AND e.organization_id = i.organization_id AND e.status = 'aprovada')
            FROM indicators i
            LEFT JOIN (
                SELECT id, indicator_id, value,
                       ROW_NUMBER() OVER (PARTITION BY indicator_id
                           ORDER BY CASE WHEN period BETWEEN ? AND ? THEN 0 ELSE 1 END, period DESC, created_at DESC, id DESC) AS rn
                FROM indicator_records) reg ON reg.indicator_id = i.id AND reg.rn = 1
            WHERE i.organization_id = ? AND i.archived = FALSE
            """, relatorioId, inicio, fim, org);
        registrar("criou um relatório", nome);
        notificacoes.notificar(NotificationService.RELATORIO_GERADO, "Relatório gerado: " + nome,
            null, null, relatorioId, Auth.userId());
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
            m.put("gri", i.get("griCodigo"));
            m.put("ods", i.get("ods"));
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

    private static String statusEvidencia(String s) {
        return switch (s) {
            case "aprovada" -> "Aprovada";
            case "rejeitada" -> "Rejeitada";
            default -> "Em análise";
        };
    }

    /**
     * "Pacote de auditoria": per active indicator, every value recorded in the period (and who entered it)
     * and every evidence with its review and a short SHA-256 of the stored file, so an auditor can check
     * that a file handed over later is the same one; plus a summary of the gaps.
     */
    private Map<String, Object> pacoteAuditoria(int org, String nome, LocalDate inicio, LocalDate fim) {
        Map<String, Object> organizacao = jdbc.queryForObject(
            "SELECT name, sector FROM organizations WHERE id = ?", (rs, n) -> {
                Map<String, Object> o = new LinkedHashMap<>();
                o.put("nome", rs.getString("name"));
                o.put("setor", rs.getString("sector"));
                return o;
            }, org);
        String autor = jdbc.queryForObject("SELECT name FROM users WHERE id = ?", String.class, Auth.userId());

        Map<Integer, Map<String, Object>> porId = new LinkedHashMap<>();
        jdbc.query("""
            SELECT i.id, i.name, i.category, i.unit, i.gri_code, i.ods, u.name AS owner_name
            FROM indicators i LEFT JOIN users u ON u.id = i.owner_id
            WHERE i.organization_id = ? AND i.archived = FALSE
            ORDER BY FIELD(i.category, 'ambiental', 'social', 'governanca'), i.name
            """, rs -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("nome", rs.getString("name"));
                m.put("pilar", switch (rs.getString("category")) {
                    case "ambiental" -> "Ambiental";
                    case "social" -> "Social";
                    default -> "Governança";
                });
                m.put("gri", rs.getString("gri_code"));
                m.put("ods", rs.getObject("ods", Integer.class));
                m.put("unidade", rs.getString("unit"));
                m.put("responsavel", rs.getString("owner_name"));
                m.put("valores", new ArrayList<Map<String, Object>>());
                m.put("evidencias", new ArrayList<Map<String, Object>>());
                porId.put(rs.getInt("id"), m);
            }, org);

        // every value whose reference date is in the period, oldest first
        jdbc.query("""
            SELECT r.indicator_id, r.value, r.period, r.created_at, u.name AS who
            FROM indicator_records r
            JOIN indicators i ON i.id = r.indicator_id
            LEFT JOIN users u ON u.id = r.entered_by
            WHERE i.organization_id = ? AND i.archived = FALSE AND r.period BETWEEN ? AND ?
            ORDER BY r.period, r.created_at, r.id
            """, rs -> {
                Map<String, Object> ind = porId.get(rs.getInt("indicator_id"));
                if (ind == null) return;
                Map<String, Object> v = new LinkedHashMap<>();
                v.put("valor", IndicatorController.valorComUnidade(rs.getBigDecimal("value"), (String) ind.get("unidade")));
                v.put("data", rs.getDate("period").toLocalDate().format(BR));
                v.put("quem", rs.getString("who"));
                v.put("registradoEm", rs.getTimestamp("created_at").toLocalDateTime().format(BR_HORA));
                @SuppressWarnings("unchecked") List<Map<String, Object>> l = (List<Map<String, Object>>) ind.get("valores");
                l.add(v);
            }, org, inicio, fim);

        // the hash is computed by MySQL, so the file content never leaves the database
        jdbc.query("""
            SELECT e.indicator_id, e.file_name, e.status, e.uploaded_at, up.name AS uploader,
                   rv.name AS reviewer, e.reviewed_at, e.review_note,
                   LEFT(SHA2(e.file_content, 256), 12) AS sha
            FROM evidence e
            JOIN indicators i ON i.id = e.indicator_id AND i.organization_id = e.organization_id
            LEFT JOIN users up ON up.id = e.uploaded_by
            LEFT JOIN users rv ON rv.id = e.reviewed_by
            WHERE e.organization_id = ? AND i.archived = FALSE
            ORDER BY e.uploaded_at, e.id
            """, rs -> {
                Map<String, Object> ind = porId.get(rs.getInt("indicator_id"));
                if (ind == null) return;
                java.sql.Timestamp revisado = rs.getTimestamp("reviewed_at"), enviado = rs.getTimestamp("uploaded_at");
                Map<String, Object> e = new LinkedHashMap<>();
                e.put("arquivo", rs.getString("file_name"));
                e.put("status", statusEvidencia(rs.getString("status")));
                e.put("enviadoPor", rs.getString("uploader"));
                e.put("enviadoEm", enviado == null ? null : enviado.toLocalDateTime().format(BR));
                e.put("revisor", rs.getString("reviewer"));
                e.put("revisadoEm", revisado == null ? null : revisado.toLocalDateTime().format(BR));
                e.put("nota", rs.getString("review_note"));
                e.put("sha256", rs.getString("sha")); // null: sent before files were stored in the database
                @SuppressWarnings("unchecked") List<Map<String, Object>> l = (List<Map<String, Object>>) ind.get("evidencias");
                l.add(e);
            }, org);

        List<String> semEvidencia = new ArrayList<>(), soNaoAprovada = new ArrayList<>(), semValor = new ArrayList<>();
        int comAprovada = 0, comValor = 0;
        Map<String, List<Map<String, Object>>> porPilar = new LinkedHashMap<>();
        for (Map<String, Object> m : porId.values()) {
            List<?> ev = (List<?>) m.get("evidencias");
            boolean aprovada = ev.stream().anyMatch(e -> "Aprovada".equals(((Map<?, ?>) e).get("status")));
            if (aprovada) comAprovada++;
            else if (ev.isEmpty()) semEvidencia.add((String) m.get("nome"));
            else soNaoAprovada.add((String) m.get("nome"));
            if (((List<?>) m.get("valores")).isEmpty()) semValor.add((String) m.get("nome"));
            else comValor++;
            porPilar.computeIfAbsent((String) m.get("pilar"), k -> new ArrayList<>()).add(m);
        }
        List<Map<String, Object>> categorias = new ArrayList<>();
        porPilar.forEach((pilar, l) -> {
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("nome", pilar);
            c.put("indicadores", l);
            categorias.add(c);
        });

        Map<String, Object> lacunas = new LinkedHashMap<>();
        lacunas.put("semEvidencia", semEvidencia);
        lacunas.put("soNaoAprovada", soNaoAprovada);
        lacunas.put("semValor", semValor);
        Map<String, Object> resumo = new LinkedHashMap<>();
        resumo.put("indicadores", porId.size());
        resumo.put("comEvidenciaAprovada", comAprovada);
        resumo.put("comValor", comValor);
        resumo.put("lacunas", lacunas);

        Map<String, Object> periodo = new LinkedHashMap<>();
        periodo.put("inicio", inicio.format(BR));
        periodo.put("fim", fim.format(BR));
        periodo.put("texto", textoPeriodo("auditoria", inicio, fim));

        Map<String, Object> s = new LinkedHashMap<>();
        s.put("nome", nome);
        s.put("modelo", "auditoria");
        s.put("modeloNome", MODELOS.get("auditoria"));
        s.put("organizacao", organizacao);
        s.put("periodo", periodo);
        s.put("geradoEm", LocalDateTime.now(ZONA).format(BR_HORA));
        s.put("geradoPor", autor);
        s.put("resumo", resumo);
        s.put("categorias", categorias);
        return s;
    }

    @GetMapping("/{id}")
    public ResponseEntity<String> snapshot(@PathVariable int id) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            SELECT r.content, r.status, u.name AS criador
            FROM reports r LEFT JOIN users u ON u.id = r.created_by
            WHERE r.id = ? AND r.organization_id = ?
            """, id, Auth.orgId());
        if (rows.isEmpty()) throw new ApiErro(404, "Relatório não encontrado.");
        String conteudo = (String) rows.get(0).get("content");
        if (conteudo == null) throw new ApiErro(404, "Este relatório foi criado antes dos relatórios com dados e não tem conteúdo.");
        // the stored snapshot plus the current status (publishing happens after generation)
        String status = "publicado".equals(rows.get(0).get("status")) ? "Publicado" : "Rascunho";
        List<Map<String, Object>> itens = jdbc.query("""
            SELECT i.name, i.unit, it.value_snapshot, it.evidence_count, reg.period
            FROM report_items it
            JOIN indicators i ON i.id = it.indicator_id
            LEFT JOIN indicator_records reg ON reg.id = it.record_id
            WHERE it.report_id = ?
            ORDER BY i.name, it.id
            """, (rs, n) -> {
                java.math.BigDecimal valor = rs.getBigDecimal("value_snapshot");
                java.sql.Date periodo = rs.getDate("period");
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("nome", rs.getString("name"));
                m.put("valor", valor == null ? "Sem registro" : IndicatorController.valorComUnidade(valor, rs.getString("unit")));
                m.put("referencia", periodo == null ? null : periodo.toLocalDate().format(BR));
                m.put("evidenciasAprovadas", rs.getInt("evidence_count"));
                return m;
            }, id);
        Map<String, Object> extras = new LinkedHashMap<>();
        extras.put("status", status);
        extras.put("criadoPor", rows.get(0).get("criador")); // null: generated before created_by existed
        extras.put("itens", itens);
        String json = conteudo.substring(0, conteudo.lastIndexOf('}')) + "," + JsonWriter.standard().writeToString(extras).substring(1);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(json);
    }

    @PostMapping("/{id}/publish")
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
