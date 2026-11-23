<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$host = getenv('SUARA_DB_HOST') ?: '127.0.0.1';
$port = getenv('SUARA_DB_PORT') ?: '3306';
$name = getenv('SUARA_DB_NAME') ?: 'suara_teknik';
$user = getenv('SUARA_DB_USER') ?: 'root';
$password = getenv('SUARA_DB_PASSWORD') ?: '';
if (!preg_match('/^[a-zA-Z0-9_]+$/D', $name)) exit("Nama database tidak valid.\n");
$mode = $argv[1] ?? 'snapshot';
if (!in_array($mode, ['snapshot', 'seed'], true)) exit("Gunakan: php scripts/import-database.php [snapshot|seed]\n");
try {
    $db = new PDO("mysql:host=$host;port=$port;charset=utf8mb4", $user, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $check = $db->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ?');
    $check->execute([$name]);
    if ((int)$check->fetchColumn() > 0) throw new RuntimeException('Database sudah berisi tabel. Impor dihentikan agar data lama tidak tertimpa.');
    $file = __DIR__ . '/../database/' . ($mode === 'snapshot' ? 'snapshot-lokal.sql' : 'suara_teknik.sql');
    $sql = file_get_contents($file);
    if ($sql === false) throw new RuntimeException('File SQL tidak dapat dibaca.');
    $sql = preg_replace('/^(CREATE DATABASE[^\r\n]*?)`?suara_teknik`?/m', '$1`' . $name . '`', $sql);
    $sql = preg_replace('/^USE `?suara_teknik`?;/m', 'USE `' . $name . '`;', $sql);
    $db->exec($sql);
    echo "Database $name berhasil diimpor ($mode).\n";
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage() . "\n");
    exit(1);
}
