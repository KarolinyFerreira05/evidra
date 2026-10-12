-- Tasks can now be created, edited and deleted by people ('manual').
-- "System" tasks (outdated indicators, evidence waiting for review) are computed in GET /tasks
-- and never stored; the column exists so a stored row can never be mistaken for a manual one.
ALTER TABLE tasks
  ADD COLUMN origin ENUM('sistema','manual') NOT NULL DEFAULT 'manual',
  ADD COLUMN indicator_id INT NULL,
  ADD CONSTRAINT tasks_indicator_fk FOREIGN KEY (indicator_id) REFERENCES indicators (id) ON DELETE SET NULL;

-- Sample rows that described what the computed tasks now cover (indicator upkeep, evidence review).
-- Matched by id AND exact text so a real task that happens to reuse an id is left alone.
DELETE FROM tasks
WHERE (id = 1 AND description = 'Atualizar emissões de CO₂ do 3º trimestre')
   OR (id = 2 AND description = 'Revisar leitura do consumo de água')
   OR (id = 3 AND description = 'Aprovar evidência da fatura de energia');
