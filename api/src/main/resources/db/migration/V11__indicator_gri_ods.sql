-- Optional reporting tags: GRI standard code ('305' = GRI 305 Emissões) and UN SDG number (9, 12, 13).
-- NULL means "no tag"; allowed values are checked in IndicatorController. Existing indicators stay untagged.
ALTER TABLE indicators
  ADD COLUMN gri_code VARCHAR(10) NULL,
  ADD COLUMN ods TINYINT NULL;
