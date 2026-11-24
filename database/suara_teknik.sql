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
CREATE TABLE IF NOT EXISTS events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  type ENUM('Forum Advokasi', 'Diskusi Terbuka', 'Kegiatan Fakultas') NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  building VARCHAR(150) NOT NULL,
  room VARCHAR(100) NOT NULL,
  topics TEXT NOT NULL,
  status ENUM('draft', 'published', 'cancelled') NOT NULL DEFAULT 'draft',
  created_by INT UNSIGNED NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX (status, event_date, start_time)
) ENGINE=InnoDB;

SET @q = IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'status_history' AND COLUMN_NAME = 'admin_id'),
  'SELECT 1',
  'ALTER TABLE status_history ADD COLUMN admin_id INT UNSIGNED NULL,
     ADD CONSTRAINT fk_status_history_admin
     FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL'
);
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Akun untuk pengujian lokal. Jangan impor blok ini ke server publik.
-- Impor ulang mengatur kembali kata sandi dan peran kedua alamat email ini.
-- NIM dan nama akun lama dipertahankan.

START TRANSACTION;

INSERT INTO users (name, email, password_hash, role)
VALUES ('Mahasiswa', 'mahasiswa@gmail.com', '$2y$12$gW.6ADrwxwqe/A.obwsWX.kGDsYeM./81TMuTRV29dADzSgaMXM8.', 'mahasiswa')
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  role = 'mahasiswa';

INSERT INTO users (name, email, password_hash, role)
VALUES ('Admin', 'admin@gmail.com', '$2y$12$ZjqFznsIgir4VvrRLaxYH.xIwyrR64qllkS9kcPHj5JXIu3IcuMFm', 'admin')
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  role = 'admin';

COMMIT;
