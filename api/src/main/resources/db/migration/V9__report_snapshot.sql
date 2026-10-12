-- Reports become snapshots: which model, which period, and the frozen content (JSON).
ALTER TABLE reports
  ADD COLUMN template VARCHAR(30) NULL,
  ADD COLUMN period_start DATE NULL,
  ADD COLUMN period_end DATE NULL,
  ADD COLUMN content LONGTEXT NULL;
