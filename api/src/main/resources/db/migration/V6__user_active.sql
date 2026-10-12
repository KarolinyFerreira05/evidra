-- Members are deactivated, never deleted: indicators, records, evidence and activity refer to them.
ALTER TABLE users
  ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN deactivated_at DATETIME NULL;
