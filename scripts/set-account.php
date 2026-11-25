<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/../api/config.php';
require __DIR__ . '/../api/laporan.php';

[$role, $name, $email, $nim] = array_pad(array_slice($argv, 1), 4, '');
$name = trim($name);
$email = strtolower(trim($email));
$nim = normalizeNim($nim);

if (
    !in_array($role, ['admin', 'mahasiswa'], true)
    || $name === ''
    || mb_strlen($name, 'UTF-8') > 100
    || strlen($email) > 100
    || !filter_var($email, FILTER_VALIDATE_EMAIL)
    || ($role === 'admin' && $nim !== '')
    || ($role === 'mahasiswa' && !preg_match('/^[A-Z0-9-]{1,30}$/D', $nim))
) {
    fwrite(STDERR, "Gunakan: php scripts/set-account.php admin NAMA EMAIL\n");
    fwrite(STDERR, "Atau: php scripts/set-account.php mahasiswa NAMA EMAIL NIM\n");
    exit(1);
}

$line = fgets(STDIN, 256);
$password = $line === false ? '' : rtrim($line, "\r\n");
if (!passwordIsValid($password, 15)) {
    fwrite(STDERR, "Masukkan kata sandi baru lewat stdin, 15 karakter sampai 72 byte.\n");
    exit(1);
}

$db = null;
try {
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $db = connectDatabase();
    $db->beginTransaction();

    $id = runQuery($db, 'SELECT id FROM users WHERE email = ? FOR UPDATE', [$email])
        ->fetchColumn();

    if ($id === false) {
        runQuery($db, '
            INSERT INTO users (name, email, nim, password_hash, role)
            VALUES (?, ?, ?, ?, ?)
        ', [$name, $email, $nim === '' ? null : $nim, $hash, $role]);
    } elseif ($role === 'admin') {
        runQuery($db, '
            UPDATE users SET name = ?, password_hash = ?, role = ?
            WHERE id = ?
        ', [$name, $hash, $role, $id]);
    } else {
        runQuery($db, '
            UPDATE users SET name = ?, nim = ?, password_hash = ?, role = ?
            WHERE id = ?
        ', [$name, $nim, $hash, $role, $id]);
    }

    $db->commit();
    echo "Akun $role siap digunakan untuk $email.\n";
} catch (Throwable $error) {
    if ($db !== null && $db->inTransaction()) {
        $db->rollBack();
    }
    $message = $error instanceof PDOException && (int) ($error->errorInfo[1] ?? 0) === 1062
        ? 'Email atau NIM sudah digunakan.'
        : 'Gagal menyimpan akun. Periksa konfigurasi serta log server.';
    error_log($error->getMessage());
    fwrite(STDERR, $message . "\n");
    exit(1);
}
