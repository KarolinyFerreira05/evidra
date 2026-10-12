-- Evidence files now live in the database instead of the local "uploads" folder,
-- which is wiped on every redeploy of the hosted plan.
ALTER TABLE evidence
  ADD COLUMN file_content LONGBLOB NULL,
  ADD COLUMN file_type VARCHAR(100) NULL,
  ADD COLUMN file_size INT NULL,
  MODIFY COLUMN file_path VARCHAR(500) NULL;
