package com.evidra.api;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Types;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Indicators in and out of Excel: CSV in UTF-8 with BOM, ";" as separator and decimal comma
 * (what Excel in Portuguese reads and writes with "Salvar como > CSV (separado por ponto e vírgula)").
 */
@RestController
@RequestMapping("/indicators")
public class IndicatorCsvController {

    static final List<String> COLUNAS = List.of(
        "nome", "categoria", "unidade", "valor", "periodo", "progresso_meta", "responsavel_email", "gri", "ods");
    private static final long MAX_BYTES = 1024 * 1024;
    private static final int MAX_LINHAS = 500;
    private static final DateTimeFormatter BR = DateTimeFormatter.ofPattern("dd/MM/uuuu");
    // also accepts 1/9/2026, which Excel writes for some date formats
    private static final DateTimeFormatter BR_LEITURA = DateTimeFormatter.ofPattern("d/M/uuuu").withResolverStyle(ResolverStyle.STRICT);
    private static final ZoneId ZONA = ZoneId.of("America/Sao_Paulo");
    private static final Map<String, String> CAT_DB =
        Map.of("ambiental", "ambiental", "social", "social", "governanca", "governanca");
    private static final Map<String, String> CAT_TEXTO =
        Map.of("ambiental", "Ambiental", "social", "Social", "governanca", "Governança");

    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;

    public IndicatorCsvController(JdbcTemplate jdbc, PlatformTransactionManager tm) {
        this.jdbc = jdbc;
        this.tx = new TransactionTemplate(tm);
    }

    // ================= Export =================

    // a cell Excel would run as a formula starts with ' so it shows as text (CSV injection);
    // tab and CR are on the same OWASP list
    static String celula(String v) {
        if (v == null) return "";
        if (!v.isEmpty() && "=+-@\t\r".indexOf(v.charAt(0)) >= 0) v = "'" + v;
        if (v.contains(";") || v.contains("\"") || v.contains("\n") || v.contains("\r")) v = "\"" + v.replace("\"", "\"\"") + "\"";
        return v;
    }

    private static String linhaCsv(List<String> cells) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < cells.size(); i++) {
            if (i > 0) sb.append(';');
            sb.append(celula(cells.get(i)));
        }
        return sb.append("\r\n").toString();
    }

    // 1240.50 -> "1240,5": decimal comma, no thousands separator (Excel reads it as a number either way)
    private static String numero(BigDecimal v) {
        return v == null ? "" : v.stripTrailingZeros().toPlainString().replace('.', ',');
    }

    private static ResponseEntity<byte[]> arquivoCsv(String nome, String conteudo) {
        byte[] texto = conteudo.getBytes(StandardCharsets.UTF_8);
        byte[] corpo = new byte[texto.length + 3];
        corpo[0] = (byte) 0xEF; corpo[1] = (byte) 0xBB; corpo[2] = (byte) 0xBF; // BOM: Excel then reads the accents right
        System.arraycopy(texto, 0, corpo, 3, texto.length);
        return ResponseEntity.ok()
            .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(nome).build().toString())
            .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
            .body(corpo);
    }

    @GetMapping("/export.csv")
    public ResponseEntity<byte[]> exportar() {
        StringBuilder sb = new StringBuilder(linhaCsv(COLUNAS));
        // latest record by reference date, same rule as GET /indicators
        jdbc.query("""
            SELECT i.name, i.category, i.unit, i.target_progress, i.gri_code, i.ods, u.email, r.`value`, r.period
            FROM indicators i
            LEFT JOIN users u ON u.id = i.owner_id
            LEFT JOIN (
                SELECT indicator_id, `value`, period,
                       ROW_NUMBER() OVER (PARTITION BY indicator_id ORDER BY period DESC, created_at DESC, id DESC) AS rn
                FROM indicator_records) r ON r.indicator_id = i.id AND r.rn = 1
            WHERE i.organization_id = ? AND i.archived = FALSE
            ORDER BY FIELD(i.category, 'ambiental', 'social', 'governanca'), i.name
            """, rs -> {
                java.sql.Date periodo = rs.getDate("period");
                Integer ods = rs.getObject("ods", Integer.class);
                sb.append(linhaCsv(List.of(
                    rs.getString("name"),
                    CAT_TEXTO.getOrDefault(rs.getString("category"), ""),
                    nn(rs.getString("unit")),
                    numero(rs.getBigDecimal("value")),
                    periodo == null ? "" : periodo.toLocalDate().format(BR),
                    String.valueOf(rs.getInt("target_progress")),
                    nn(rs.getString("email")),
                    nn(rs.getString("gri_code")),
                    ods == null ? "" : String.valueOf(ods))));
            }, Auth.orgId());
        return arquivoCsv("indicadores-" + LocalDate.now(ZONA) + ".csv", sb.toString());
    }

    @GetMapping("/template.csv")
    public ResponseEntity<byte[]> modelo() {
        // the examples use the current user's e-mail, so the template imports as it is
        String email = jdbc.queryForObject("SELECT email FROM users WHERE id = ?", String.class, Auth.userId());
        String hoje = LocalDate.now(ZONA).format(BR);
        String csv = linhaCsv(COLUNAS)
            + linhaCsv(List.of("Emissões de CO₂ (escopo 1)", "Ambiental", "tCO₂e", "1240,5", hoje, "60", email, "305", "13"))
            + linhaCsv(List.of("Mulheres na liderança", "Social", "%", "38", hoje, "45", email, "405", ""));
        return arquivoCsv("modelo-indicadores.csv", csv);
    }

    private static String nn(String s) {
        return s == null ? "" : s;
    }

    // ================= Import =================

    /** One data row of the file: its line number, the cells by column name, and what was understood from them. */
    private static final class Linha {
        int numero;
        Map<String, String> cel = new HashMap<>();
        List<String> erros = new ArrayList<>();
        String nome, categoria, unidade;
        BigDecimal valor;
        LocalDate periodo;
        int prog;
        int frequencia;
        Integer donoId;
        String gri;
        Integer ods;
        Integer indicadorId;   // existing indicator that gets a new value
        Integer linhaCriadora; // an earlier line of this file that creates the indicator
    }

    // "Governança", "governanca", "GOVERNANÇA" -> "governanca"
    private static String chave(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).strip();
    }

    // the same name in another case is the same indicator; accents still make a difference
    private static String chaveNome(String s) {
        return s.strip().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    // a leading ' added by an export (or by hand) to keep Excel from running a formula is not part of the value
    private static String limparCelula(String v) {
        v = v.strip();
        if (v.length() > 1 && v.charAt(0) == '\'' && "=+-@".indexOf(v.charAt(1)) >= 0) v = v.substring(1);
        return v;
    }

    // UTF-8 (with or without BOM); a file saved by Excel as plain "CSV" in Windows-1252 is read too
    private static String decodificar(byte[] b) {
        int ini = b.length >= 3 && (b[0] & 0xFF) == 0xEF && (b[1] & 0xFF) == 0xBB && (b[2] & 0xFF) == 0xBF ? 3 : 0;
        ByteBuffer buf = ByteBuffer.wrap(b, ini, b.length - ini);
        try {
            return StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT)
                .decode(buf).toString();
        } catch (CharacterCodingException e) {
            return new String(b, ini, b.length - ini, Charset.forName("windows-1252"));
        }
    }

    /** Rows of a ";" CSV with "quoted" cells (which may hold ; "" and line breaks); index 0 of each row is its line number. */
    private static List<List<String>> lerCsv(String texto) {
        List<List<String>> linhas = new ArrayList<>();
        List<String> atual = new ArrayList<>();
        StringBuilder cel = new StringBuilder();
        boolean aspas = false;
        int linha = 1, inicio = 1;
        for (int i = 0; i < texto.length(); i++) {
            char c = texto.charAt(i);
            if (aspas) {
                if (c == '"' && i + 1 < texto.length() && texto.charAt(i + 1) == '"') { cel.append('"'); i++; }
                else if (c == '"') aspas = false;
                else { if (c == '\n') linha++; cel.append(c); }
            } else if (c == '"' && cel.toString().isBlank()) {
                aspas = true;
                cel.setLength(0);
            } else if (c == ';') {
                atual.add(cel.toString()); cel.setLength(0);
            } else if (c == '\n' || c == '\r') {
                if (c == '\r' && i + 1 < texto.length() && texto.charAt(i + 1) == '\n') i++;
                atual.add(cel.toString()); cel.setLength(0);
                atual.add(0, String.valueOf(inicio));
                linhas.add(atual);
                atual = new ArrayList<>();
                linha++;
                inicio = linha;
            } else {
                cel.append(c);
            }
        }
        if (cel.length() > 0 || !atual.isEmpty()) {
            atual.add(cel.toString());
            atual.add(0, String.valueOf(inicio));
            linhas.add(atual);
        }
        return linhas;
    }

    @PostMapping("/import")
    public ResponseEntity<?> importar(@RequestParam MultipartFile arquivo,
                                      @RequestParam(defaultValue = "false") boolean confirmar)
            throws IOException {
        Auth.exigir(Auth.RESPONSAVEL);
        if (arquivo.isEmpty()) throw new ApiErro(400, "Selecione um arquivo CSV.");
        if (arquivo.getSize() > MAX_BYTES) throw new ApiErro(413, "O arquivo passa do limite de 1 MB.");
        String original = arquivo.getOriginalFilename() == null ? "" : arquivo.getOriginalFilename().toLowerCase(Locale.ROOT);
        if (original.endsWith(".xlsx") || original.endsWith(".xls"))
            throw new ApiErro(400, "Envie o arquivo em CSV. No Excel, use Salvar como > CSV (separado por ponto e vírgula).");

        List<List<String>> linhas = lerCsv(decodificar(arquivo.getBytes()));
        // blank lines (Excel leaves ";;;;;;;;" at the end) are skipped
        linhas.removeIf(l -> l.subList(1, l.size()).stream().allMatch(String::isBlank));
        if (linhas.isEmpty()) throw new ApiErro(400, "O arquivo está vazio.");

        List<String> cab = linhas.get(0).subList(1, linhas.get(0).size()).stream().map(IndicatorCsvController::chave).toList();
        if (cab.size() == 1 && cab.get(0).contains(","))
            throw new ApiErro(400, "O arquivo usa vírgula como separador. No Excel, use Salvar como > CSV (separado por ponto e vírgula).");
        List<String> faltam = COLUNAS.stream().filter(c -> !cab.contains(c)).toList();
        if (!faltam.isEmpty())
            throw new ApiErro(400, "Faltam colunas no cabeçalho: " + String.join(", ", faltam)
                + ". Baixe o modelo para ver o formato esperado.");
        List<List<String>> dados = linhas.subList(1, linhas.size());
        if (dados.isEmpty()) throw new ApiErro(400, "O arquivo só tem o cabeçalho. Inclua ao menos um indicador.");
        if (dados.size() > MAX_LINHAS)
            throw new ApiErro(400, "O arquivo tem " + dados.size() + " linhas de dados; o limite é " + MAX_LINHAS + " por importação.");

        List<Linha> lidas = validar(cab, dados);
        long comErros = lidas.stream().filter(l -> !l.erros.isEmpty()).count();

        if (confirmar) {
            if (comErros > 0) {
                Map<String, Object> r = resultado(lidas, false);
                r.put("erro", "Corrija as linhas com erro antes de importar.");
                return ResponseEntity.status(422).body(r);
            }
            gravar(lidas);
        }
        return ResponseEntity.ok(resultado(lidas, confirmar));
    }

    private List<Linha> validar(List<String> cab, List<List<String>> dados) {
        int org = Auth.orgId();
        // name -> id of the organization's indicators; archived ones are reported, not reused
        Map<String, Integer> ativos = new HashMap<>(), arquivados = new HashMap<>();
        jdbc.query("SELECT id, name, archived FROM indicators WHERE organization_id = ?", rs -> {
            (rs.getBoolean("archived") ? arquivados : ativos).putIfAbsent(chaveNome(rs.getString("name")), rs.getInt("id"));
        }, org);
        Map<String, Object[]> membros = new HashMap<>(); // e-mail -> {id, active}
        jdbc.query("SELECT id, email, active FROM users WHERE organization_id = ?", rs -> {
            membros.put(rs.getString("email").strip().toLowerCase(Locale.ROOT), new Object[] { rs.getInt("id"), rs.getBoolean("active") });
        }, org);

        Map<String, Integer> criadosNoArquivo = new HashMap<>(); // name -> line that creates it
        LocalDate hoje = LocalDate.now(ZONA);
        List<Linha> out = new ArrayList<>();
        for (List<String> d : dados) {
            Linha l = new Linha();
            l.numero = Integer.parseInt(d.get(0));
            List<String> faltando = new ArrayList<>();
            for (int c = 0; c < cab.size(); c++) {
                if (c + 1 < d.size()) l.cel.put(cab.get(c), limparCelula(d.get(c + 1)));
                else if (COLUNAS.contains(cab.get(c))) faltando.add(cab.get(c));
            }
            if (!faltando.isEmpty()) {
                l.erros.add("Faltam colunas nesta linha: " + String.join(", ", faltando) + ".");
                out.add(l);
                continue;
            }

            l.nome = l.cel.get("nome").replaceAll("\\s+", " ");
            if (l.nome.isEmpty()) l.erros.add("Informe o nome do indicador.");
            else if (l.nome.length() > 150) l.erros.add("O nome pode ter no máximo 150 caracteres.");

            String cat = l.cel.get("categoria");
            l.categoria = CAT_DB.get(chave(cat));
            if (l.categoria == null)
                l.erros.add(cat.isEmpty() ? "Informe a categoria: Ambiental, Social ou Governança."
                    : "Categoria inválida (“" + cat + "”): use Ambiental, Social ou Governança.");

            l.unidade = l.cel.get("unidade");
            if (l.unidade.length() > 30) l.erros.add("A unidade pode ter no máximo 30 caracteres.");

            String v = l.cel.get("valor").replace(" ", "").replace(" ", "");
            if (v.isEmpty()) l.erros.add("Informe o valor.");
            else if (!v.matches("-?[\\d.]+(,\\d+)?") || !v.matches(".*\\d.*"))
                l.erros.add("Número inválido em valor (“" + l.cel.get("valor") + "”): use vírgula para decimais, como 1240,5.");
            else {
                // Brazilian format: "." is thousands, "," is decimal ("1.240" = 1240, "0,8" = 0.8)
                l.valor = new BigDecimal(v.replace(".", "").replace(",", ".")).setScale(2, RoundingMode.HALF_UP);
                if (l.valor.abs().compareTo(new BigDecimal("9999999999999")) > 0) l.erros.add("Valor grande demais.");
            }

            String p = l.cel.get("periodo");
            if (p.isEmpty()) l.erros.add("Informe a data em periodo (dd/mm/aaaa).");
            else {
                try {
                    l.periodo = LocalDate.parse(p, BR_LEITURA);
                    if (l.periodo.isAfter(hoje)) l.erros.add("Data inválida em periodo (“" + p + "”): não pode estar no futuro.");
                } catch (DateTimeParseException e) {
                    l.erros.add("Data inválida em periodo (“" + p + "”): use dd/mm/aaaa, como 30/09/2026.");
                }
            }

            String prog = l.cel.get("progresso_meta").replace("%", "").strip();
            if (prog.isEmpty()) l.prog = 0;
            else {
                try {
                    l.prog = Integer.parseInt(prog);
                    if (l.prog < 0 || l.prog > 100) throw new NumberFormatException();
                } catch (NumberFormatException e) {
                    l.erros.add("Número inválido em progresso_meta (“" + l.cel.get("progresso_meta") + "”): use um inteiro de 0 a 100.");
                }
            }

            // optional column, so it is not in COLUNAS
            String freq = l.cel.getOrDefault("frequencia_dias", "");
            if (freq.isEmpty()) l.frequencia = 90;
            else {
                try {
                    l.frequencia = Integer.parseInt(freq);
                    if (l.frequencia < 1 || l.frequencia > 3650) throw new NumberFormatException();
                } catch (NumberFormatException e) {
                    l.erros.add("Número inválido em frequencia_dias (“" + freq + "”): use um inteiro de 1 a 3650.");
                }
            }

            String email = l.cel.get("responsavel_email").toLowerCase(Locale.ROOT);
            if (email.isEmpty()) l.donoId = Auth.userId(); // same as "Novo indicador": whoever creates it
            else {
                Object[] m = membros.get(email);
                if (m == null) l.erros.add("Responsável desconhecido: " + l.cel.get("responsavel_email") + " não é membro da equipe.");
                else if (!(Boolean) m[1]) l.erros.add("Responsável inativo: " + l.cel.get("responsavel_email") + ".");
                else l.donoId = (Integer) m[0];
            }

            try {
                l.gri = IndicatorController.griCodigo(l.cel.get("gri"));
            } catch (ApiErro e) {
                l.erros.add("Código GRI inválido (“" + l.cel.get("gri") + "”): use 205, 302, 303, 305, 306, 401, 403, 404 ou 405.");
            }
            try {
                l.ods = IndicatorController.ods(l.cel.get("ods"));
            } catch (ApiErro e) {
                l.erros.add("ODS inválido (“" + l.cel.get("ods") + "”): use 9, 12 ou 13.");
            }

            if (!l.nome.isEmpty()) {
                String k = chaveNome(l.nome);
                if (ativos.containsKey(k)) l.indicadorId = ativos.get(k);
                else if (criadosNoArquivo.containsKey(k)) l.linhaCriadora = criadosNoArquivo.get(k);
                else if (arquivados.containsKey(k))
                    l.erros.add("Existe um indicador arquivado com este nome. Restaure-o em Indicadores → Ver arquivados antes de importar.");
                else if (l.erros.isEmpty()) criadosNoArquivo.put(k, l.numero);
            }
            out.add(l);
        }
        return out;
    }

    private void gravar(List<Linha> lidas) {
        int org = Auth.orgId(), eu = Auth.userId();
        int[] novos = { 0 }, valores = { 0 };
        // all or nothing: any failure rolls back every indicator and value of this file
        tx.executeWithoutResult(status -> {
            Map<Integer, Integer> idPorLinha = new HashMap<>();
            for (Linha l : lidas) {
                Integer id = l.indicadorId != null ? l.indicadorId
                    : l.linhaCriadora != null ? idPorLinha.get(l.linhaCriadora) : null;
                if (id == null) {
                    KeyHolder kh = new GeneratedKeyHolder();
                    jdbc.update(con -> {
                        PreparedStatement ps = con.prepareStatement("""
                            INSERT INTO indicators (organization_id, name, category, unit, target_progress, owner_id, gri_code, ods, update_frequency_days)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, Statement.RETURN_GENERATED_KEYS);
                        ps.setInt(1, org);
                        ps.setString(2, l.nome);
                        ps.setString(3, l.categoria);
                        ps.setString(4, l.unidade.isEmpty() ? null : l.unidade);
                        ps.setInt(5, l.prog);
                        ps.setInt(6, l.donoId);
                        ps.setString(7, l.gri);
                        ps.setObject(8, l.ods, Types.TINYINT);
                        ps.setInt(9, l.frequencia);
                        return ps;
                    }, kh);
                    id = kh.getKey().intValue();
                    idPorLinha.put(l.numero, id);
                    novos[0]++;
                } else {
                    valores[0]++;
                }
                jdbc.update("INSERT INTO indicator_records (indicator_id, value, period, entered_by) VALUES (?, ?, ?, ?)",
                    id, l.valor, l.periodo, eu);
                jdbc.update("UPDATE indicators SET in_review = FALSE WHERE id = ? AND organization_id = ?", id, org);
            }
            jdbc.update("INSERT INTO activity_log (organization_id, user_id, action, detail) VALUES (?, ?, ?, ?)",
                org, eu, "importou indicadores (CSV)",
                lidas.size() + (lidas.size() == 1 ? " linha: " : " linhas: ")
                    + novos[0] + (novos[0] == 1 ? " indicador novo, " : " indicadores novos, ")
                    + valores[0] + (valores[0] == 1 ? " valor em indicador existente" : " valores em indicadores existentes"));
        });
    }

    private static Map<String, Object> resultado(List<Linha> lidas, boolean importado) {
        List<Map<String, Object>> linhas = new ArrayList<>();
        int novos = 0, valores = 0, erros = 0;
        for (Linha l : lidas) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("linha", l.numero);
            m.put("nome", l.nome);
            m.put("ok", l.erros.isEmpty());
            m.put("erros", l.erros);
            String acao = null;
            if (l.erros.isEmpty()) {
                if (l.indicadorId != null || l.linhaCriadora != null) { acao = "Novo valor em indicador existente"; valores++; }
                else { acao = "Novo indicador"; novos++; }
                if (l.linhaCriadora != null) acao = "Novo valor no indicador criado na linha " + l.linhaCriadora;
            } else {
                erros++;
            }
            m.put("acao", acao);
            linhas.add(m);
        }
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("importado", importado);
        r.put("total", lidas.size());
        r.put("comErros", erros);
        r.put("novos", novos);
        r.put("novosValores", valores);
        r.put("linhas", linhas);
        return r;
    }
}
