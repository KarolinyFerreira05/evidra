package com.evidra.api;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Writes rows in the notifications table, respecting each recipient's notification_preferences. */
@Service
public class NotificationService {

    static final String INDICADOR_DESATUALIZADO = "indicador_desatualizado", EVIDENCIA_APROVADA = "evidencia_aprovada",
        EVIDENCIA_REJEITADA = "evidencia_rejeitada", EVIDENCIA_EM_ANALISE = "evidencia_em_analise", RELATORIO_GERADO = "relatorio_gerado";
    static final List<String> TIPOS = List.of(
        INDICADOR_DESATUALIZADO, EVIDENCIA_APROVADA, EVIDENCIA_REJEITADA, EVIDENCIA_EM_ANALISE, RELATORIO_GERADO);

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final JdbcTemplate jdbc;

    public NotificationService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Owner of an indicator of the user's organization, or null when there is none. */
    Integer responsavel(Integer indicatorId) {
        if (indicatorId == null) return null;
        try {
            return jdbc.queryForList("SELECT owner_id FROM indicators WHERE id = ? AND organization_id = ?",
                    Integer.class, indicatorId, Auth.orgId())
                .stream().findFirst().orElse(null);
        } catch (DataAccessException e) {
            log.error("Erro ao buscar responsável do indicador {}", indicatorId, e);
            return null;
        }
    }

    // no row means on
    private boolean ligado(int userId, String tipo) {
        List<Boolean> linhas = jdbc.queryForList(
            "SELECT enabled FROM notification_preferences WHERE user_id = ? AND type = ?", Boolean.class, userId, tipo);
        return linhas.isEmpty() || Boolean.TRUE.equals(linhas.get(0));
    }

    /** One notification per distinct recipient (null ones are skipped). A failure here never undoes the action that caused it. */
    void notificar(String tipo, String mensagem, Integer indicatorId, Integer evidenceId, Integer reportId, Integer... destinatarios) {
        String texto = mensagem.length() > 255 ? mensagem.substring(0, 254) + "…" : mensagem;
        try {
            for (Integer usuario : new LinkedHashSet<>(Arrays.asList(destinatarios))) {
                if (usuario == null || !ligado(usuario, tipo)) continue;
                jdbc.update("""
                    INSERT INTO notifications (organization_id, user_id, type, message, indicator_id, evidence_id, report_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, Auth.orgId(), usuario, tipo, texto, indicatorId, evidenceId, reportId);
            }
        } catch (DataAccessException e) {
            log.error("Erro ao gravar notificação do tipo {}", tipo, e);
        }
    }
}
