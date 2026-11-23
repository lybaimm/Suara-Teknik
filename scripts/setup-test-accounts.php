<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__ . '/../api/config.php';
try {
    $db = connectDatabase();
    $db->beginTransaction();
    $credentials = [];
    foreach (['mahasiswa', 'admin'] as $role) {
        $email = $role . '-demo@example.test';
        $query = $db->prepare('SELECT id FROM users WHERE email = ? AND role = ? FOR UPDATE');
        $query->execute([$email, $role]);
        $id = $query->fetchColumn();
        if ($id === false) {
            throw new RuntimeException('Akun contoh tidak ditemukan: ' . $email);
        }
        $password = bin2hex(random_bytes(16));
        $update = $db->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $update->execute([password_hash($password, PASSWORD_DEFAULT), $id]);
        $credentials[] = [$role, $email, $password];
    }
    $db->commit();
    foreach ($credentials as [$role, $email, $password]) {
        echo "\n$role\nEmail: $email\nPassword: $password\n";
    }
    echo "\nSimpan secara privat. Menjalankan ulang akan mengganti password.\n";
} catch (Throwable $error) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    fwrite(STDERR, $error->getMessage() . PHP_EOL);
    exit(1);
}
