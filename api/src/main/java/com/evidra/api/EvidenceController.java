package com.evidra.api;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.List;
import java.util.Map;

import org.springframework.dao.DataAccessException;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletResponse;

@RestController
public class EvidenceController {

    // must match spring.servlet.multipart.max-file-size and the text in index.html / App.js
    static final long MAX_BYTES = 10L * 1024 * 1024;
    static final String MSG_GRANDE = "O arquivo passa do limite de 10 MB.";

    // allowed extension -> Content-Type sent back on download (never trust the browser's type)
    private static final Map<String, String> TIPOS = Map.of(
        "pdf", "application/pdf",
        "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "xls", "application/vnd.ms-excel",
        "csv", "text/csv",
        "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "png", "image/png",
        "jpg", "image/jpeg",
        "jpeg", "image/jpeg");
    // opened in the browser; everything else is downloaded
    private static final java.util.Set<String> INLINE = java.util.Set.of("application/pdf", "image/png", "image/jpeg");

    private final JdbcTemplate jdbc;

    public EvidenceController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static ResponseEntity<Map<String, String>> erro(int status, String msg) {
        return ResponseEntity.status(status).body(Map.of("erro", msg));
    }

    private static String extensao(String nome) {
        int p = nome.lastIndexOf('.');
        return p < 0 ? "" : nome.substring(p + 1).toLowerCase();
    }

    // keeps only the last path segment and safe characters, so the name is fine in a header or a download
    static String limparNome(String nome) {
        String n = nome.replace('\\', '/');
        n = n.substring(n.lastIndexOf('/') + 1);
        n = Normalizer.normalize(n, Normalizer.Form.NFC)
            .replaceAll("\\p{Cntrl}", "")
            .replaceAll("[^\\p{L}\\p{N} ._()\\-]", "_")
            .replaceAll("\\s+", " ")
            .replaceAll("^[.\\s]+", "")
            .trim();
        if (n.length() > 200) {
            String ext = extensao(n);
            n = n.substring(0, 200 - ext.length() - 1).trim() + "." + ext;
        }
        return n;
    }

    private void registrar(String acao, String detalhe) {
        jdbc.update(
            "INSERT INTO activity_log (organization_id, user_id, action, detail) VALUES (?, ?, ?, ?)",
            Auth.orgId(), Auth.userId(), acao, detalhe.length() > 255 ? detalhe.substring(0, 254) + "…" : detalhe);
    }

    // name of the indicator, or null when it doesn't exist in the user's organization
    private String nomeIndicador(int indicatorId) {
        return jdbc.queryForList("SELECT name FROM indicators WHERE id = ? AND organization_id = ? AND archived = FALSE",
            String.class, indicatorId, Auth.orgId()).stream().findFirst().orElse(null);
    }

    @PostMapping("/evidence")
    public ResponseEntity<?> upload(@RequestParam("arquivo") MultipartFile arquivo,
                                    @RequestParam(value = "nome", required = false) String nome,
                                    @RequestParam(value = "indicatorId", required = false) Integer indicatorId,
                                    @RequestParam(value = "descricao", required = false) String descricao)
            throws IOException {
        Auth.exigir(Auth.RESPONSAVEL);
        if (arquivo.isEmpty()) return erro(400, "Selecione um arquivo para enviar.");
        if (arquivo.getSize() > MAX_BYTES) return erro(413, MSG_GRANDE);

        String indicador = null;
        if (indicatorId != null) {
            indicador = nomeIndicador(indicatorId);
            if (indicador == null) return erro(400, "Indicador não encontrado.");
        }
        descricao = descricao == null ? null : descricao.strip().replaceAll("\\p{Cntrl}", " ");
        if (descricao != null && descricao.isEmpty()) descricao = null;
        if (descricao != null && descricao.length() > 255)
            return erro(400, "A descrição pode ter no máximo 255 caracteres.");

        String original = arquivo.getOriginalFilename() == null ? "" : limparNome(arquivo.getOriginalFilename());
        String ext = extensao(original);
        String tipo = TIPOS.get(ext);
        if (tipo == null)
            return erro(415, "Tipo de arquivo não permitido. Envie PDF, XLSX, XLS, CSV, DOCX, PNG, JPG ou JPEG.");

        String nomeFinal = limparNome(nome == null || nome.isBlank() ? original : nome);
        if (!extensao(nomeFinal).equals(ext)) nomeFinal = nomeFinal + "." + ext;
        if (nomeFinal.equals("." + ext)) nomeFinal = "arquivo." + ext;

        byte[] conteudo = arquivo.getBytes();
        try {
            jdbc.update("""
                INSERT INTO evidence (organization_id, indicator_id, file_name, description, file_content, file_type, file_size, uploaded_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, Auth.orgId(), indicatorId, nomeFinal, descricao, conteudo, tipo, conteudo.length, Auth.userId());
        } catch (DataAccessException e) {
            // max_allowed_packet or the InnoDB redo-log BLOB limit on the server
            String causa = String.valueOf(e.getMostSpecificCause().getMessage());
            if (causa.contains("max_allowed_packet") || causa.contains("redo log") || causa.contains("Packet for query"))
                return erro(413, "O arquivo é grande demais para ser salvo. Tente um arquivo menor.");
            throw e;
        }
        registrar("adicionou uma evidência", indicador == null ? nomeFinal : nomeFinal + " → " + indicador);
        return ResponseEntity.status(201).body(Map.of("ok", true));
    }

    // {"decisao": "aprovada" | "rejeitada", "nota": "..."}: auditor or admin, never on their own upload
    @PatchMapping("/evidence/{id}/review")
    public ResponseEntity<?> revisar(@PathVariable int id, @RequestBody Map<String, Object> body) {
        Auth.exigir(Auth.AUDITOR);
        String decisao = body.get("decisao") == null ? "" : String.valueOf(body.get("decisao")).strip();
        if (!decisao.equals("aprovada") && !decisao.equals("rejeitada"))
            throw new ApiErro(400, "Escolha aprovar ou rejeitar.");
        String nota = body.get("nota") == null ? "" : String.valueOf(body.get("nota")).strip().replaceAll("\\p{Cntrl}", " ");
        if (decisao.equals("rejeitada") && nota.isEmpty()) throw new ApiErro(400, "Informe o motivo da rejeição.");
        if (nota.length() > 255) throw new ApiErro(400, "O motivo pode ter no máximo 255 caracteres.");

        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT file_name, status, uploaded_by FROM evidence WHERE id = ? AND organization_id = ?", id, Auth.orgId());
        if (rows.isEmpty()) throw new ApiErro(404, "Evidência não encontrada.");
        Map<String, Object> ev = rows.get(0);
        if (((Number) ev.get("uploaded_by")).intValue() == Auth.userId())
            throw new ApiErro(403, "Você não pode revisar uma evidência que você mesmo enviou.");
        if (!"em_analise".equals(ev.get("status"))) throw new ApiErro(409, "Esta evidência já foi revisada.");

        // the status condition keeps two simultaneous reviews from both succeeding
        int n = jdbc.update("""
            UPDATE evidence SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_note = ?
            WHERE id = ? AND organization_id = ? AND status = 'em_analise'
            """, decisao, Auth.userId(), nota.isEmpty() ? null : nota, id, Auth.orgId());
        if (n == 0) throw new ApiErro(409, "Esta evidência já foi revisada.");
        String nome = (String) ev.get("file_name");
        registrar(decisao.equals("aprovada") ? "aprovou uma evidência" : "rejeitou uma evidência",
            nota.isEmpty() ? nome : nome + ": " + nota);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // links an existing evidence to an indicator, changes it, or unlinks it with {"indicatorId": null}
    @PatchMapping("/evidence/{id}")
    public ResponseEntity<?> vincular(@PathVariable int id, @RequestBody Map<String, Object> body) {
        Auth.exigir(Auth.RESPONSAVEL);
        if (!body.containsKey("indicatorId")) return erro(400, "Informe o indicador.");
        Object valor = body.get("indicatorId");
        Integer indicatorId;
        try {
            indicatorId = valor == null || "".equals(valor) ? null : Integer.valueOf(String.valueOf(valor));
        } catch (NumberFormatException e) {
            return erro(400, "Indicador inválido.");
        }

        String indicador = null;
        if (indicatorId != null) {
            indicador = nomeIndicador(indicatorId);
            if (indicador == null) return erro(400, "Indicador não encontrado.");
        }
        List<String> nomes = jdbc.queryForList(
            "SELECT file_name FROM evidence WHERE id = ? AND organization_id = ?", String.class, id, Auth.orgId());
        if (nomes.isEmpty()) return erro(404, "Evidência não encontrada.");

        jdbc.update("UPDATE evidence SET indicator_id = ? WHERE id = ? AND organization_id = ?",
            indicatorId, id, Auth.orgId());
        if (indicador == null) registrar("desvinculou uma evidência", nomes.get(0));
        else registrar("vinculou uma evidência", nomes.get(0) + " → " + indicador);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/evidence/{id}/file")
    public void arquivo(@PathVariable int id, HttpServletResponse res) throws IOException {
        Boolean achou = jdbc.query("""
            SELECT file_name, file_type, file_size, file_content FROM evidence
            WHERE id = ? AND organization_id = ? AND file_content IS NOT NULL
            """, rs -> {
                if (!rs.next()) return false;
                String tipo = rs.getString("file_type");
                ContentDisposition cd = (INLINE.contains(tipo) ? ContentDisposition.inline() : ContentDisposition.attachment())
                    .filename(rs.getString("file_name"), StandardCharsets.UTF_8).build();
                res.setContentType(tipo);
                res.setContentLength(rs.getInt("file_size"));
                res.setHeader(HttpHeaders.CONTENT_DISPOSITION, cd.toString());
                res.setHeader("X-Content-Type-Options", "nosniff");
                res.setHeader(HttpHeaders.CACHE_CONTROL, "private, no-store");
                try (InputStream in = rs.getBinaryStream("file_content")) {
                    in.transferTo(res.getOutputStream());
                } catch (IOException e) {
                    throw new UncheckedIOException(e);
                }
                return true;
            }, id, Auth.orgId());

        if (!Boolean.TRUE.equals(achou)) {
            res.setStatus(404);
            res.setContentType("application/json;charset=UTF-8");
            res.getWriter().write("{\"erro\":\"Arquivo não encontrado.\"}");
        }
    }
}
