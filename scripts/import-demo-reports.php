<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/../api/config.php';
require __DIR__ . '/../api/laporan.php';

$db = null;
try {
    if (!appIsLocal() || !in_array(getenv('SUARA_DB_HOST') ?: '127.0.0.1', ['127.0.0.1', 'localhost', '::1'], true)) {
        throw new RuntimeException('Impor laporan contoh hanya bisa dilakukan pada database lokal.');
    }
    $nim = normalizeNim($argv[1] ?? '');
    $apply = ($argv[2] ?? '') === '--apply';
    if ($nim === '' || $argc > 3 || ($argc === 3 && !$apply)) {
        throw new RuntimeException('Gunakan: php scripts/import-demo-reports.php NIM [--apply]');
    }

    $directory = __DIR__ . '/../database';
    $reports = json_decode(file_get_contents($directory . '/demo-reports.json'), true, 512, JSON_THROW_ON_ERROR);
    $photos = [];
    foreach (array_unique(array_column($reports, 'photo')) as $name) {
        $file = $directory . '/report-images/' . basename($name);
        $bytes = file_get_contents($file);
        if ($bytes === false || strlen($bytes) > 3 * 1024 * 1024 ||
            (@getimagesizefromstring($bytes)['mime'] ?? '') !== 'image/png') {
            throw new RuntimeException('Lampiran tidak valid: ' . $name);
        }
        $photos[$name] = $bytes;
    }

    $db = connectDatabase();
    $db->beginTransaction();
    $owner = runQuery($db, "SELECT id FROM users WHERE nim = ? AND role = 'mahasiswa'" . ($apply ? ' FOR UPDATE' : ''), [$nim])->fetchColumn();
    if ($owner === false) {
        throw new RuntimeException('Akun mahasiswa dengan NIM tersebut tidak ditemukan di database tujuan.');
    }
    $existing = runQuery($db, 'SELECT title, description FROM reports WHERE user_id = ?', [$owner])->fetchAll();
    $known = [];
    foreach ($existing as $row) {
        $known[$row['title']] = true;
    }

    $planned = 0;
    foreach ($reports as $report) {
        if (isset($known[$report['title']])) {
            continue;
        }
        $planned++;
        if (!$apply) {
            continue;
        }
        runQuery($db, "
            INSERT INTO reports (user_id, type, category, title, location, description, photo, photo_type,
                                 status, method, forum_period, forum_result)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'image/png', ?, ?, ?, ?)
        ", [$owner, $report['type'], $report['category'], $report['title'], $report['location'],
            $report['description'], $photos[$report['photo']], $report['status'], $report['method'],
            $report['forumPeriod'], $report['forumResult']]);
        $id = (int) $db->lastInsertId();
        addHistory($db, $id, INITIAL_STATUS, 'Data contoh untuk rekaman.');
        if ($report['status'] !== INITIAL_STATUS) {
            addHistory($db, $id, $report['status'], 'Status contoh untuk rekaman.');
        }
    }

    if ($apply) {
        $db->commit();
    } else {
        $db->rollBack();
    }
    echo ($apply ? 'Laporan ditambahkan: ' : 'Laporan yang akan ditambahkan: ') . $planned . PHP_EOL;
} catch (Throwable $error) {
    if ($db !== null && $db->inTransaction()) {
        $db->rollBack();
    }
    fwrite(STDERR, $error->getMessage() . PHP_EOL);
    exit(1);
}
