CREATE DATABASE IF NOT EXISTS suara_teknik
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE suara_teknik;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  nim VARCHAR(30) UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  role ENUM('mahasiswa', 'admin') NOT NULL DEFAULT 'mahasiswa'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reports (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type ENUM('Aspirasi', 'Pengaduan') NOT NULL,
  category VARCHAR(70) NOT NULL,
  title VARCHAR(150) NOT NULL,
  location VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  photo MEDIUMBLOB,
  photo_type VARCHAR(20),
  status VARCHAR(30) NOT NULL DEFAULT 'Menunggu Verifikasi',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX (user_id, id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS status_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id INT UNSIGNED NOT NULL,
  status VARCHAR(30) NOT NULL,
  note TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS responses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id INT UNSIGNED NOT NULL,
  admin_id INT UNSIGNED NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS demo_setup (
  id TINYINT UNSIGNED PRIMARY KEY
) ENGINE=InnoDB;

-- Data contoh dipasang sekali, sehingga impor ulang tidak menimpa laporan.
START TRANSACTION;

INSERT IGNORE INTO users (name, email, role)
SELECT 'Mahasiswa', 'mahasiswa-demo@example.test', 'mahasiswa'
WHERE NOT EXISTS (SELECT 1 FROM demo_setup WHERE id = 1);

INSERT IGNORE INTO users (name, email, role)
SELECT 'Admin', 'admin-demo@example.test', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM demo_setup WHERE id = 1);

INSERT IGNORE INTO users (name, email, role)
SELECT 'Mahasiswa Contoh', 'mahasiswa-lain@example.test', 'mahasiswa'
WHERE NOT EXISTS (SELECT 1 FROM demo_setup WHERE id = 1);

SET @mahasiswa = (SELECT id FROM users WHERE email = 'mahasiswa-demo@example.test');
SET @lain = (SELECT id FROM users WHERE email = 'mahasiswa-lain@example.test');
SET @admin = (SELECT id FROM users WHERE email = 'admin-demo@example.test');

INSERT IGNORE INTO reports
  (id, user_id, type, category, title, location, description, status, created_at)
SELECT
  1, @mahasiswa, 'Pengaduan', 'Fasilitas dan Infrastruktur',
  'Proyektor di ruang kelas redup', 'Ruang B.204',
  'Tulisan pada layar sulit terbaca dari kursi belakang, terutama saat kelas siang.',
  'Sedang Diproses', '2026-11-16'
WHERE NOT EXISTS (SELECT 1 FROM demo_setup WHERE id = 1);

INSERT IGNORE INTO reports
  (id, user_id, type, category, title, location, description, status, created_at)
SELECT
  2, @mahasiswa, 'Aspirasi', 'Kebersihan dan Kenyamanan',
  'Usulan tempat sampah terpilah', 'Selasar gedung perkuliahan',
  'Tambahkan tempat sampah terpilah di dekat tangga agar mudah dijangkau.',
  'Menunggu Verifikasi', '2026-11-18'
WHERE NOT EXISTS (SELECT 1 FROM demo_setup WHERE id = 1);

INSERT IGNORE INTO reports
  (id, user_id, type, category, title, location, description, status, created_at)
SELECT
  3, @lain, 'Aspirasi', 'Organisasi dan Kegiatan Mahasiswa',
  'Papan informasi kegiatan mahasiswa', 'Lobi Fakultas Teknik',
  'Usul memakai satu papan informasi untuk pengumuman kegiatan lintas himpunan.',
  'Selesai', '2026-11-14'
WHERE NOT EXISTS (SELECT 1 FROM demo_setup WHERE id = 1);

INSERT INTO status_history (report_id, status, note, created_at)
SELECT id, 'Menunggu Verifikasi', '', created_at
FROM reports
WHERE id IN (1, 2, 3)
  AND NOT EXISTS (SELECT 1 FROM demo_setup WHERE id = 1);

INSERT INTO status_history (report_id, status, note, created_at)
SELECT 1, 'Diverifikasi', '', '2026-11-16'
WHERE NOT EXISTS (SELECT 1 FROM demo_setup WHERE id = 1)
UNION ALL
SELECT 1, 'Sedang Diproses', '', '2026-11-17'
WHERE NOT EXISTS (SELECT 1 FROM demo_setup WHERE id = 1)
UNION ALL
SELECT 3, 'Diverifikasi', '', '2026-11-14'
WHERE NOT EXISTS (SELECT 1 FROM demo_setup WHERE id = 1)
UNION ALL
SELECT 3, 'Sedang Diproses', '', '2026-11-15'
WHERE NOT EXISTS (SELECT 1 FROM demo_setup WHERE id = 1)
UNION ALL
SELECT 3, 'Selesai', '', '2026-11-16'
WHERE NOT EXISTS (SELECT 1 FROM demo_setup WHERE id = 1);

INSERT INTO responses (report_id, admin_id, message, created_at)
SELECT 1, @admin,
  'Laporan sudah kami teruskan ke pengelola ruang kelas untuk pengecekan.', '2026-11-17'
WHERE NOT EXISTS (SELECT 1 FROM demo_setup WHERE id = 1)
UNION ALL
SELECT 3, @admin, 'Papan informasi tersedia di sisi kiri lobi.', '2026-11-16'
WHERE NOT EXISTS (SELECT 1 FROM demo_setup WHERE id = 1);

INSERT IGNORE INTO demo_setup (id) VALUES (1);
COMMIT;

USE suara_teknik;
-- Aman untuk database lama; tidak menghapus data.
SET @q = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reports' AND COLUMN_NAME='method'), 'SELECT 1', 'ALTER TABLE reports ADD COLUMN method VARCHAR(12) NULL');
PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @q = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reports' AND COLUMN_NAME='forum_result'), 'SELECT 1', 'ALTER TABLE reports ADD COLUMN forum_result TEXT NULL');
PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @q = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='reports' AND COLUMN_NAME='forum_period'), 'SELECT 1', 'ALTER TABLE reports ADD COLUMN forum_period VARCHAR(30) NULL');
PREPARE stmt FROM @q; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE reports SET method='direct' WHERE method IS NULL AND status <> 'Menunggu Verifikasi';
CREATE TABLE IF NOT EXISTS notifications (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id INT UNSIGNED NOT NULL,
 report_code VARCHAR(13) NULL, title VARCHAR(120) NOT NULL, message VARCHAR(255) NOT NULL,
 is_read TINYINT(1) NOT NULL DEFAULT 0, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, INDEX(user_id,is_read,id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS push_subscriptions (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id INT UNSIGNED NOT NULL,
 endpoint_hash CHAR(64) NOT NULL UNIQUE, endpoint TEXT NOT NULL, p256dh VARCHAR(120) NOT NULL, auth VARCHAR(64) NOT NULL,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, INDEX(user_id)
) ENGINE=InnoDB;
