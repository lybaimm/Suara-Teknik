<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$name = getenv('SUARA_DB_NAME') ?: '';
if (!preg_match('/^suara_teknik_security_[a-z0-9_]+$/D', $name)) exit('Refusing non-test database');
require __DIR__ . '/../api/config.php';
$db = connectDatabase();
$password = bin2hex(random_bytes(18));
$stmt = $db->prepare("INSERT INTO users (name,email,password_hash,role) VALUES ('Security audit administrator','audit-admin@example.test',?,'admin') ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash)");
$stmt->execute([password_hash($password, PASSWORD_DEFAULT)]);
$directory = __DIR__ . '/../.runtime';
if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) exit(1);
file_put_contents($directory . '/security-fixture.json', json_encode(['identifier' => 'audit-admin@example.test', 'password' => $password]));
echo "Isolated administrator fixture ready\n";
