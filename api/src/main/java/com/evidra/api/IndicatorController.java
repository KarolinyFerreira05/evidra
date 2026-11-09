package com.evidra.api;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/indicators")
public class IndicatorController {

    private static final Logger log = LoggerFactory.getLogger(IndicatorController.class);
    private static final DateTimeFormatter BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final ZoneId ZONA = ZoneId.of("America/Sao_Paulo");
    private static final Map<String, String> CAT_DB =
        Map.of("Ambiental", "ambiental", "Social", "social", "Governança", "governanca");
    // GRI standards and UN SDGs an indicator can be tagged with (keep in sync with GRI_OPCOES / ODS_OPCOES in App.js)
    static final Set<String> GRI = Set.of("205", "302", "303", "305", "306", "401", "403", "404", "405");
    static final Set<Integer> ODS = Set.of(9, 12, 13);

    private final JdbcTemplate jdbc;

    public IndicatorController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o).strip();
    }

    private static String cat(String c) {
        return switch (c) {
            case "ambiental" -> "Ambiental";
            case "social" -> "Social";
            default -> "Governança";
        };
    }

    /** Value with its unit, the way the cards show it ("1.240 tCO₂e", "46%"). */
    static String valorComUnidade(BigDecimal value, String unit) {
        if (value == null) return "—";
        String sep = ("%".equals(unit) || "h/pessoa".equals(unit)) ? "" : " ";
        return NumberFormat.getNumberInstance(Locale.of("pt", "BR")).format(value)
            + (unit != null && !unit.isBlank() ? sep + unit : "");
    }

    /** GRI code ("305", also "GRI 305"), or null for "no tag"; anything else is a 400. */
    static String griCodigo(Object o) {
        String g = str(o).replaceFirst("(?i)^GRI\\s*", "");
        if (g.isEmpty()) return null;
        if (!GRI.contains(g)) throw new ApiErro(400, "Código GRI inválido: use 205, 302, 303, 305, 306, 401, 403, 404 ou 405.");
        return g;
    }

    /** SDG number ("13", also "ODS 13"), or null for "no tag"; anything else is a 400. */
    static Integer ods(Object o) {
        String s = str(o).replaceFirst("(?i)^ODS\\s*", "");
        if (s.isEmpty()) return null;
        try {
            int n = Integer.parseInt(s);
            if (ODS.contains(n)) return n;
        } catch (NumberFormatException e) {
            // falls through to the message below
        }
        throw new ApiErro(400, "ODS inválido: use 9, 12 ou 13.");
    }

    private void registrar(String acao, String detalhe) {
        jdbc.update("INSERT INTO activity_log (organization_id, user_id, action, detail) VALUES (?, ?, ?, ?)",
            Auth.orgId(), Auth.userId(), acao, detalhe.length() > 255 ? detalhe.substring(0, 254) + "…" : detalhe);
    }

    // name of an active (not archived) indicator of the user's organization, or 404
    private String nomeAtivo(int id) {
        return jdbc.queryForList(
                "SELECT name FROM indicators WHERE id = ? AND organization_id = ? AND archived = FALSE",
                String.class, id, Auth.orgId())
            .stream().findFirst().orElseThrow(() -> new ApiErro(404, "Indicador não encontrado."));
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        try {
            return listar();
        } catch (RuntimeException e) {
            log.error("Erro em /indicators", e);
            throw e;
        }
    }

    private List<Map<String, Object>> listar() {
        // r = latest record by reference date (ties: the last one entered), r2 = the one before it (for "tend");
        // freshness ("Desatualizado") is about when someone last entered anything, so it uses MAX(created_at)
        String sql = """
            SELECT i.id, i.name, i.category, i.unit, i.target_progress, i.in_review,
                   i.update_frequency_days, i.owner_id, u.name AS owner_name, i.gri_code, i.ods,
                   r.`value`, r2.`value` AS previous_value,
                   r.last_update,
                   TIMESTAMPDIFF(MONTH, r.last_update, NOW()) AS months_ago,
                   (SELECT COUNT(*) FROM evidence e WHERE e.indicator_id = i.id AND e.organization_id = i.organization_id) AS evidence_count
            FROM indicators i
            LEFT JOIN users u ON u.id = i.owner_id
            LEFT JOIN (
                SELECT indicator_id, `value`,
                       ROW_NUMBER() OVER (PARTITION BY indicator_id ORDER BY period DESC, created_at DESC, id DESC) AS rn,
                       MAX(created_at) OVER (PARTITION BY indicator_id) AS last_update
                FROM indicator_records) r ON r.indicator_id = i.id AND r.rn = 1
            LEFT JOIN (
                SELECT indicator_id, `value`,
                       ROW_NUMBER() OVER (PARTITION BY indicator_id ORDER BY period DESC, created_at DESC, id DESC) AS rn
                FROM indicator_records) r2 ON r2.indicator_id = i.id AND r2.rn = 2
            WHERE i.organization_id = ? AND i.archived = FALSE
            """;

        return jdbc.query(sql, (rs, n) -> {
            Timestamp last = rs.getTimestamp("last_update");
            long days = last == null ? Long.MAX_VALUE
                    : ChronoUnit.DAYS.between(last.toLocalDateTime(), LocalDateTime.now());
            String status = rs.getBoolean("in_review") ? "Em revisão"
                    : days > rs.getInt("update_frequency_days") ? "Desatualizado"
                    : "Atualizado";

            BigDecimal value = rs.getBigDecimal("value"), anterior = rs.getBigDecimal("previous_value");
            // percentage change between the two latest records; 0 with fewer than two (or from zero)
            double tend = value == null || anterior == null || anterior.signum() == 0 ? 0
                : value.subtract(anterior).multiply(BigDecimal.valueOf(100))
                    .divide(anterior.abs(), 1, RoundingMode.HALF_UP).doubleValue();

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
            m.put("cat", cat(rs.getString("category")));
            m.put("valor", valorComUnidade(value, rs.getString("unit")));
            m.put("tend", tend);
            m.put("prog", rs.getInt("target_progress"));
            m.put("status", status);
            m.put("ha", rs.getInt("months_ago"));
            m.put("resp", sigla);
            m.put("evidencias", rs.getInt("evidence_count"));
            // raw fields for the edit dialog
            m.put("unidade", rs.getString("unit"));
            m.put("donoId", rs.getObject("owner_id", Integer.class));
            m.put("dono", owner);
            m.put("frequencia", rs.getInt("update_frequency_days"));
            m.put("griCodigo", rs.getString("gri_code"));
            m.put("ods", rs.getObject("ods", Integer.class));
            return m;
        }, Auth.orgId());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> editar(@PathVariable int id, @RequestBody Map<String, Object> body) {
        Auth.exigir(Auth.RESPONSAVEL);
        nomeAtivo(id);
        int org = Auth.orgId();

        String nome = str(body.get("nome"));
        if (nome.isEmpty()) throw new ApiErro(400, "Informe o nome do indicador.");
        if (nome.length() > 150) throw new ApiErro(400, "O nome pode ter no máximo 150 caracteres.");
        String categoria = CAT_DB.get(str(body.get("cat")));
        if (categoria == null) throw new ApiErro(400, "Escolha o pilar: Ambiental, Social ou Governança.");
        String unidade = str(body.get("unidade"));
        if (unidade.length() > 30) throw new ApiErro(400, "A unidade pode ter no máximo 30 caracteres.");
        int prog, frequencia;
        try {
            prog = Integer.parseInt(str(body.get("prog")));
            frequencia = Integer.parseInt(str(body.get("frequencia")));
        } catch (NumberFormatException e) {
            throw new ApiErro(400, "Progresso e frequência precisam ser números inteiros.");
        }
        if (prog < 0 || prog > 100) throw new ApiErro(400, "O progresso da meta vai de 0 a 100.");
        if (frequencia < 1 || frequencia > 3650) throw new ApiErro(400, "A frequência de atualização vai de 1 a 3650 dias.");

        Integer dono = null;
        if (!str(body.get("donoId")).isEmpty()) {
            try {
                dono = Integer.valueOf(str(body.get("donoId")));
            } catch (NumberFormatException e) {
                throw new ApiErro(400, "Responsável inválido.");
            }
            Integer atual = jdbc.queryForObject("SELECT owner_id FROM indicators WHERE id = ?", Integer.class, id);
            // a new owner must be an active member; an unchanged (possibly inactive) one may stay
            if (!dono.equals(atual) && jdbc.queryForObject(
                    "SELECT COUNT(*) FROM users WHERE id = ? AND organization_id = ? AND active = TRUE",
                    Integer.class, dono, org) == 0)
                throw new ApiErro(400, "Escolha um responsável ativo da equipe.");
        }

        // a client that doesn't send the tags keeps them; sending null or "" removes them
        Map<String, Object> atuais = jdbc.queryForMap("SELECT gri_code, ods FROM indicators WHERE id = ?", id);
        String gri = body.containsKey("griCodigo") ? griCodigo(body.get("griCodigo")) : (String) atuais.get("gri_code");
        Integer ods = body.containsKey("ods") ? ods(body.get("ods"))
            : atuais.get("ods") == null ? null : ((Number) atuais.get("ods")).intValue();

        jdbc.update("""
            UPDATE indicators SET name = ?, category = ?, unit = ?, target_progress = ?, owner_id = ?, update_frequency_days = ?,
                                  gri_code = ?, ods = ?
            WHERE id = ? AND organization_id = ?
            """, nome, categoria, unidade.isEmpty() ? null : unidade, prog, dono, frequencia, gri, ods, id, org);
        registrar("editou um indicador", nome);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // archiving instead of deleting: records, evidence and history keep pointing at it
    @DeleteMapping("/{id}")
    public ResponseEntity<?> arquivar(@PathVariable int id) {
        Auth.exigir(Auth.RESPONSAVEL);
        String nome = nomeAtivo(id);
        jdbc.update("UPDATE indicators SET archived = TRUE WHERE id = ? AND organization_id = ?", id, Auth.orgId());
        registrar("arquivou um indicador", nome);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/archived")
    public List<Map<String, Object>> arquivados() {
        return jdbc.query("""
            SELECT i.id, i.name, i.category, u.name AS owner_name,
                   (SELECT COUNT(*) FROM indicator_records WHERE indicator_id = i.id) AS records,
                   (SELECT COUNT(*) FROM evidence e WHERE e.indicator_id = i.id AND e.organization_id = i.organization_id) AS evidence_count
            FROM indicators i LEFT JOIN users u ON u.id = i.owner_id
            WHERE i.organization_id = ? AND i.archived = TRUE
            ORDER BY i.name
            """, (rs, n) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getInt("id"));
                m.put("nome", rs.getString("name"));
                m.put("cat", cat(rs.getString("category")));
                m.put("dono", rs.getString("owner_name"));
                m.put("registros", rs.getInt("records"));
                m.put("evidencias", rs.getInt("evidence_count"));
                return m;
            }, Auth.orgId());
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<?> restaurar(@PathVariable int id) {
        Auth.exigir(Auth.RESPONSAVEL);
        String nome = jdbc.queryForList(
                "SELECT name FROM indicators WHERE id = ? AND organization_id = ? AND archived = TRUE",
                String.class, id, Auth.orgId())
            .stream().findFirst().orElseThrow(() -> new ApiErro(404, "Indicador arquivado não encontrado."));
        jdbc.update("UPDATE indicators SET archived = FALSE WHERE id = ? AND organization_id = ?", id, Auth.orgId());
        registrar("restaurou um indicador", nome);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // {"valor": "1.250,5", "periodo": "2026-09-30"}: a new measurement
    @PostMapping("/{id}/records")
    public ResponseEntity<?> novoRegistro(@PathVariable int id, @RequestBody Map<String, Object> body) {
        Auth.exigir(Auth.RESPONSAVEL);
        String nome = nomeAtivo(id);

        String texto = str(body.get("valor"));
        BigDecimal valor;
        try {
            // Brazilian format: "." is thousands, "," is decimal ("1.240" = 1240, "0,8" = 0.8)
            if (!texto.matches("-?[\\d.]+(,\\d+)?")) throw new NumberFormatException();
            valor = new BigDecimal(texto.replace(".", "").replace(",", "."));
        } catch (NumberFormatException e) {
            throw new ApiErro(400, "Informe um valor numérico, como 1.250 ou 45,5.");
        }
        if (valor.abs().compareTo(new BigDecimal("9999999999999")) > 0) throw new ApiErro(400, "Valor grande demais.");

        LocalDate periodo;
        try {
            periodo = LocalDate.parse(str(body.get("periodo")));
        } catch (DateTimeParseException e) {
            throw new ApiErro(400, "Informe a data de referência do valor.");
        }
        if (periodo.isAfter(LocalDate.now(ZONA))) throw new ApiErro(400, "A data de referência não pode estar no futuro.");

        jdbc.update("INSERT INTO indicator_records (indicator_id, value, period, entered_by) VALUES (?, ?, ?, ?)",
            id, valor.setScale(2, RoundingMode.HALF_UP), periodo, Auth.userId());
        jdbc.update("UPDATE indicators SET in_review = FALSE WHERE id = ?", id);
        String unidade = jdbc.queryForObject("SELECT unit FROM indicators WHERE id = ?", String.class, id);
        registrar("registrou um novo valor", nome + ": " + valorComUnidade(valor, unidade));
        return ResponseEntity.status(201).body(Map.of("ok", true));
    }

    @GetMapping("/{id}/records")
    public Map<String, Object> historico(@PathVariable int id) {
        // archived indicators keep a readable history
        String nome = jdbc.queryForList("SELECT name FROM indicators WHERE id = ? AND organization_id = ?",
                String.class, id, Auth.orgId())
            .stream().findFirst().orElseThrow(() -> new ApiErro(404, "Indicador não encontrado."));
        String unidade = jdbc.queryForObject("SELECT unit FROM indicators WHERE id = ?", String.class, id);
        List<Map<String, Object>> registros = jdbc.query("""
            SELECT r.id, r.period, r.value, r.created_at, u.name
            FROM indicator_records r JOIN users u ON u.id = r.entered_by
            WHERE r.indicator_id = ?
            ORDER BY r.period, r.created_at, r.id
            """, (rs, n) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getInt("id"));
                m.put("periodo", rs.getDate("period").toLocalDate().toString());
                m.put("valor", rs.getBigDecimal("value"));
                m.put("valorTexto", valorComUnidade(rs.getBigDecimal("value"), unidade));
                m.put("registradoEm", rs.getTimestamp("created_at").toLocalDateTime().format(BR));
                m.put("quem", rs.getString("name")); // inactive members keep their name in history
                return m;
            }, id);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("nome", nome);
        out.put("unidade", unidade);
        out.put("registros", registros);
        return out;
    }
}
