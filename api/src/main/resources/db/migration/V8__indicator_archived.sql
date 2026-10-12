-- Indicators are archived, never deleted: records, evidence, tasks and reports keep referring to them.
ALTER TABLE indicators
  ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;
