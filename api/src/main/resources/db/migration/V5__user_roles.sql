-- Access profiles: admin (everything), responsavel (keeps data up to date), auditor (reads and reviews).
ALTER TABLE users
  ADD COLUMN role ENUM('admin','responsavel','auditor') NOT NULL DEFAULT 'responsavel';

UPDATE users SET role = 'admin'   WHERE email = 'karoliny@exemplo.com';
UPDATE users SET role = 'auditor' WHERE email = 'paulo@exemplo.com';
