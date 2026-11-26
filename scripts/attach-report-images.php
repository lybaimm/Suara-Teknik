<?php
declare(strict_types=1);
// Optional local demo data utility; never serves report attachments over HTTP.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../api/config.php';
try {
    if (!appIsLocal() || !in_array(getenv('SUARA_DB_HOST') ?: '127.0.0.1', ['127.0.0.1', 'localhost', '::1'], true)) {
        throw new RuntimeException('Skrip gambar contoh hanya untuk database lokal.');
    }
    $args = array_slice($argv, 1);
    if (array_diff($args, ['--apply'])) {
        throw new RuntimeException('Penggunaan: php scripts/attach-report-images.php [--apply]');
    }
    $apply = in_array('--apply', $args, true);
    $categories = [
        'Akademik dan Perkuliahan' => 'academic',
        'Fasilitas dan Infrastruktur' => 'facilities',
        'Administrasi Fakultas' => 'administration',
        'Organisasi dan Kegiatan Mahasiswa' => 'organizations',
        'Kebersihan dan Kenyamanan' => 'environment',
        'Lainnya' => 'other',
    ];
    $images = [];
    foreach ($categories as $category => $key) {
        $file = __DIR__ . '/../database/report-images/' . $key . '.png';
        $info = getimagesize($file);
        $bytes = file_get_contents($file);
        if (!$info || $info['mime'] !== 'image/png' || $bytes === false || strlen($bytes) > 3 * 1024 * 1024) {
            throw new RuntimeException('Gambar tidak valid: ' . $key);
        }
        $images[$category] = $bytes;
    }
    $db = connectDatabase();
    $planned = 0; $updated = 0;
    $db->beginTransaction();
    $rows = $db->query('SELECT id, category FROM reports WHERE photo IS NULL ORDER BY id' . ($apply ? ' FOR UPDATE' : ''))->fetchAll();
    $update = $db->prepare('UPDATE reports SET photo=?, photo_type=? WHERE id=? AND category=? AND photo IS NULL');
    foreach ($rows as $row) {
        if (!isset($images[$row['category']])) continue;
        $planned++;
        if ($apply) {
            $update->execute([$images[$row['category']], 'image/png', $row['id'], $row['category']]);
            $updated += $update->rowCount();
        }
    }
    if ($apply) $db->commit(); else $db->rollBack();
    echo json_encode(['mode' => $apply ? 'apply' : 'dry-run', 'eligible' => $planned, 'updated' => $updated], JSON_PRETTY_PRINT) . PHP_EOL;
} catch (Throwable $error) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    fwrite(STDERR, $error->getMessage() . PHP_EOL);
    exit(1);
}
