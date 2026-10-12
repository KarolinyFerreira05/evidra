-- Optional free-text note on an evidence, entered in the "Nova evidência" form.
ALTER TABLE evidence
  ADD COLUMN description VARCHAR(255) NULL;
