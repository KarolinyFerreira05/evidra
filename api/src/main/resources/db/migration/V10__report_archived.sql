-- Reports are archived, never deleted: a published report stays an official record even when hidden.
ALTER TABLE reports
  ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;
