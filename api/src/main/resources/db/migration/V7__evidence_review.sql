-- Review of evidence by an auditor or admin (reviewed_by already exists).
ALTER TABLE evidence
  ADD COLUMN reviewed_at DATETIME NULL,
  ADD COLUMN review_note VARCHAR(255) NULL;
