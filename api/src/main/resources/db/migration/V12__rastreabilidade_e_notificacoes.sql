-- V12: rastreabilidade (evidencia -> valor, relatorio -> indicadores), notificacoes e indices.
-- Compativel com MySQL e TiDB: um ALTER por mudanca, sem subconsulta em ON.

-- 1) Notificacoes (o sino do sistema)
CREATE TABLE IF NOT EXISTS notifications (
  id              INT NOT NULL AUTO_INCREMENT,
  organization_id INT NOT NULL,
  user_id         INT NOT NULL,
  type            ENUM('indicador_desatualizado','evidencia_aprovada','evidencia_rejeitada','evidencia_em_analise','relatorio_gerado') NOT NULL,
  message         VARCHAR(255) NOT NULL,
  indicator_id    INT NULL,
  evidence_id     INT NULL,
  report_id       INT NULL,
  read_at         DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user_read (user_id, read_at, created_at),
  KEY idx_notifications_org (organization_id),
  CONSTRAINT fk_notifications_org  FOREIGN KEY (organization_id) REFERENCES organizations (id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id)         REFERENCES users (id),
  CONSTRAINT fk_notifications_ind  FOREIGN KEY (indicator_id)    REFERENCES indicators (id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_evi  FOREIGN KEY (evidence_id)     REFERENCES evidence (id)   ON DELETE CASCADE,
  CONSTRAINT fk_notifications_rep  FOREIGN KEY (report_id)       REFERENCES reports (id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2) Preferencias de notificacao (tela Configuracoes)
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id INT NOT NULL,
  type    ENUM('indicador_desatualizado','evidencia_aprovada','evidencia_rejeitada','evidencia_em_analise','relatorio_gerado') NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, type),
  CONSTRAINT fk_notif_pref_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3) Evidencia aponta para o VALOR que ela comprova
ALTER TABLE evidence ADD COLUMN record_id INT NULL;
ALTER TABLE evidence ADD CONSTRAINT fk_evidence_record FOREIGN KEY (record_id) REFERENCES indicator_records (id) ON DELETE SET NULL;

-- 4) Relatorio registra quem gerou
ALTER TABLE reports ADD COLUMN created_by INT NULL;
ALTER TABLE reports ADD CONSTRAINT fk_reports_created_by FOREIGN KEY (created_by) REFERENCES users (id);

-- 5) Itens do relatorio: quais indicadores/valores entraram (N:N com historico do valor)
CREATE TABLE IF NOT EXISTS report_items (
  id             INT NOT NULL AUTO_INCREMENT,
  report_id      INT NOT NULL,
  indicator_id   INT NOT NULL,
  record_id      INT NULL,
  value_snapshot DECIMAL(15,2) NULL,
  evidence_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_report_indicator (report_id, indicator_id),
  KEY idx_report_items_indicator (indicator_id),
  CONSTRAINT fk_report_items_report FOREIGN KEY (report_id)    REFERENCES reports (id)            ON DELETE CASCADE,
  CONSTRAINT fk_report_items_ind    FOREIGN KEY (indicator_id) REFERENCES indicators (id),
  CONSTRAINT fk_report_items_record FOREIGN KEY (record_id)    REFERENCES indicator_records (id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 6) Indices para as consultas das telas
CREATE INDEX idx_records_indicator_period ON indicator_records (indicator_id, period);
CREATE INDEX idx_evidence_indicator_status ON evidence (indicator_id, status);
CREATE INDEX idx_activity_org_created ON activity_log (organization_id, created_at);

-- 7) GRI e ODS dos 9 indicadores do mockup (so onde ainda estiver vazio)
UPDATE indicators SET gri_code = '305-1', ods = 13 WHERE id = 1 AND gri_code IS NULL;
UPDATE indicators SET gri_code = '303-5', ods = 6  WHERE id = 2 AND gri_code IS NULL;
UPDATE indicators SET gri_code = '302-1', ods = 7  WHERE id = 3 AND gri_code IS NULL;
UPDATE indicators SET gri_code = '306-4', ods = 12 WHERE id = 4 AND gri_code IS NULL;
UPDATE indicators SET gri_code = '405-1', ods = 5  WHERE id = 5 AND gri_code IS NULL;
UPDATE indicators SET gri_code = '404-1', ods = 4  WHERE id = 6 AND gri_code IS NULL;
UPDATE indicators SET gri_code = '403-9', ods = 8  WHERE id = 7 AND gri_code IS NULL;
UPDATE indicators SET gri_code = '2-9',   ods = 16 WHERE id = 8 AND gri_code IS NULL;
UPDATE indicators SET gri_code = '205-2', ods = 16 WHERE id = 9 AND gri_code IS NULL;
