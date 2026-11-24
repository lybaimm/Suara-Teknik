<?php
declare(strict_types=1);

const INITIAL_STATUS = 'Menunggu Verifikasi';
const STATUSES = [INITIAL_STATUS, 'Diverifikasi', 'Sedang Diproses', 'Selesai', 'Ditolak', 'Menunggu Forum Advokasi', 'Telah Dibahas'];
const CATEGORIES = [
    'Akademik dan Perkuliahan',
    'Fasilitas dan Infrastruktur',
    'Administrasi Fakultas',
    'Organisasi dan Kegiatan Mahasiswa',
    'Kebersihan dan Kenyamanan',
    'Lainnya',
];

function runQuery(PDO $db, string $sql, array $values = []): PDOStatement
{
    $query = $db->prepare($sql);
    $query->execute($values);
    return $query;
}

function reportCode(int $id): string
{
    return 'ST-' . str_pad((string) $id, 3, '0', STR_PAD_LEFT);
}

function reportNumber(string $code): int
{
    if (!preg_match('/^ST-[0-9]{3,10}$/D', $code)) {
        fail(404, 'Laporan tidak ditemukan.');
    }
    return (int) substr($code, 3);
}

function reportDate(string $value): string
{
    $months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
        'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    $date = new DateTimeImmutable($value);
    return $date->format('j') . ' ' . $months[(int) $date->format('n') - 1]
        . ' ' . $date->format('Y');
}

function getReports(PDO $db, array $user): array
{
    $scope = $user['role'] === 'admin' ? '' : 'WHERE user_id = ?';
    $values = $scope === '' ? [] : [$user['id']];
    $rows = runQuery($db, "
        SELECT id, user_id, type, category, title, location, description,
               photo IS NOT NULL AS has_photo, status, method, forum_period, forum_result, created_at
        FROM reports $scope
        ORDER BY id
    ", $values)->fetchAll();

    $actorVisible = $user['role'] === 'admin';
    $reports = [];
    foreach ($rows as $row) {
        $id = (int) $row['id'];
        $code = reportCode($id);
        $timeline = runQuery($db, '
            SELECT history.status, history.note, history.created_at, users.name AS actor
            FROM status_history AS history
            LEFT JOIN users ON history.admin_id = users.id
            WHERE history.report_id = ? ORDER BY history.id DESC
        ', [$id])->fetchAll();
        $responses = runQuery($db, '
            SELECT message, created_at FROM responses
            WHERE report_id = ? ORDER BY id DESC
        ', [$id])->fetchAll();

        $reports[] = [
            'id' => $code,
            'owner' => (int) $row['user_id'],
            'type' => $row['type'],
            'category' => $row['category'],
            'title' => $row['title'],
            'location' => $row['location'],
            'description' => $row['description'],
            'status' => $row['status'],
            'method' => $row['method'],
            'forumPeriod' => $row['forum_period'],
            'forumResult' => $row['forum_result'],
            'date' => reportDate($row['created_at']),
            'photo' => $row['has_photo'] ? 'api/index.php?photo=' . $code : '',
            'timeline' => array_map(static fn(array $entry): array => [
                'status' => $entry['status'],
                'date' => reportDate($entry['created_at']),
                'note' => $entry['note'],
                'actor' => $actorVisible ? $entry['actor'] : null,
            ], $timeline),
            'responses' => array_map(static fn(array $entry): array => [
                'text' => $entry['message'],
                'date' => reportDate($entry['created_at']),
            ], $responses),
        ];
    }
    return $reports;
}

function getReport(PDO $db, array $user, int $id, bool $lock = false): array
{
    $scope = $user['role'] === 'admin' ? '' : ' AND user_id = ?';
    $values = $scope === '' ? [$id] : [$id, $user['id']];
    $suffix = $lock ? ' FOR UPDATE' : '';
    $report = runQuery(
        $db,
        "SELECT id, status, user_id, method, forum_period, forum_result FROM reports WHERE id = ?$scope$suffix",
        $values
    )->fetch();

    if (!$report) {
        fail(404, 'Laporan tidak ditemukan.');
    }
    return $report;
}

function sendPhoto(PDO $db, array $user, int $id): void
{
    $scope = $user['role'] === 'admin' ? '' : ' AND user_id = ?';
    $values = $scope === '' ? [$id] : [$id, $user['id']];
    $photo = runQuery($db, "
        SELECT photo, photo_type FROM reports WHERE id = ? AND photo IS NOT NULL$scope
    ", $values)->fetch();

    if (!$photo) {
        fail(404, 'Foto tidak ditemukan.');
    }

    header('Content-Type: ' . $photo['photo_type']);
    echo $photo['photo'];
    exit;
}

function readPhoto(array $input): ?array
{
    if (!array_key_exists('photo', $input)) {
        return null;
    }

    $value = $input['photo'];
    if (!is_string($value) || strlen($value) > 4 * 1024 * 1024 + 30 ||
        !preg_match('~^data:(image/(?:jpeg|png|webp));base64,~', $value, $match)) {
        fail(422, 'Pilih foto JPG, PNG, atau WebP hingga 3 MB.');
    }
    $bytes = base64_decode(substr($value, strlen($match[0])), true);
    if ($bytes === false || strlen($bytes) > 3 * 1024 * 1024) {
        fail(422, 'Pilih foto JPG, PNG, atau WebP hingga 3 MB.');
    }
    $info = @getimagesizefromstring($bytes);
    if (($info['mime'] ?? '') !== $match[1]) {
        fail(422, 'Isi file foto tidak cocok dengan formatnya.');
    }
    return [$bytes, $match[1]];
}

function addHistory(
    PDO $db, int $id, string $status, string $note = '', ?int $adminId = null
): void
{
    runQuery($db, '
        INSERT INTO status_history (report_id, status, note, admin_id) VALUES (?, ?, ?, ?)
    ', [$id, $status, $note, $adminId]);
}

function saveReport(PDO $db, array $user, array $input, ?int $id): string
{
    $type = field($input, 'type', 15);
    $category = field($input, 'category', 70);
    if (!in_array($type, ['Aspirasi', 'Pengaduan'], true) ||
        !in_array($category, CATEGORIES, true)) {
        fail(422, 'Jenis atau kategori laporan tidak valid.');
    }
    $fields = [
        $type, $category, field($input, 'title', 150),
        field($input, 'location', 150), field($input, 'description', 2000),
    ];
    $photo = readPhoto($input);

    if ($id === null) {
        runQuery($db, '
            INSERT INTO reports (type, category, title, location, description,
                                 user_id, photo, photo_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ', [...$fields, $user['id'], ...($photo ?? [null, null])]);
        $id = (int) $db->lastInsertId();
        addHistory($db, $id, INITIAL_STATUS);
        return reportCode($id);
    }

    requirePending($db, $user, $id);
    $photoClause = $photo === null ? '' : ', photo = ?, photo_type = ?';
    runQuery($db, "
        UPDATE reports
        SET type = ?, category = ?, title = ?, location = ?, description = ?$photoClause
        WHERE id = ?
    ", [...$fields, ...($photo ?? []), $id]);
    return reportCode($id);
}

function requirePending(PDO $db, array $user, int $id): void
{
    if (getReport($db, $user, $id, true)['status'] !== INITIAL_STATUS) {
        fail(409, 'Laporan hanya dapat diubah atau dihapus sebelum verifikasi.');
    }
}

function nextReportStatuses(string $method, string $current): array
{
    $flow = [
        'direct' => [
            INITIAL_STATUS => ['Diverifikasi', 'Selesai', 'Ditolak'],
            'Diverifikasi' => ['Sedang Diproses', 'Selesai', 'Ditolak'],
            'Sedang Diproses' => ['Selesai', 'Ditolak'],
        ],
        'forum' => [
            INITIAL_STATUS => ['Menunggu Forum Advokasi', 'Ditolak'],
            'Menunggu Forum Advokasi' => ['Telah Dibahas', 'Ditolak'],
            'Telah Dibahas' => ['Sedang Diproses', 'Selesai', 'Ditolak'],
            'Sedang Diproses' => ['Selesai', 'Ditolak'],
        ],
    ];
    return $flow[$method][$current] ?? [];
}

function followUp(PDO $db, array $user, array $input, int $id): void
{
    $status = field($input, 'status', 30);
    $note = field($input, 'response', 2000, false);
    $method = field($input, 'method', 12, false);
    $period = field($input, 'forumPeriod', 30, false);
    $result = field($input, 'forumResult', 2000, false);
    if (!in_array($method, ['direct', 'forum'], true)) {
        fail(422, 'Pilih metode penanganan terlebih dahulu.');
    }
    if ($method === 'forum' && $period !== '' && !preg_match('/^(I|II) - [0-9]{4}$/D', $period)) {
        fail(422, 'Periode forum tidak valid.');
    }

    $report = getReport($db, $user, $id, true);
    $current = $report['status'];
    if ($report['method'] && $report['method'] !== $method) {
        fail(409, 'Metode penanganan sudah ditetapkan.');
    }
    if ($current === INITIAL_STATUS && $status === $current) {
        fail(422, 'Pilih status awal setelah menentukan metode.');
    }
    $statusChanged = $status !== $current;
    if ($statusChanged && !in_array($status, nextReportStatuses($method, $current), true)) {
        fail(409, 'Perpindahan status tidak sesuai alur penanganan.');
    }
    if ($statusChanged && $status === 'Ditolak' && $note === '') {
        fail(422, 'Tulis alasan penolakan.');
    }
    if ($current === INITIAL_STATUS && $status === 'Selesai' && $note === '') {
        fail(422, 'Tulis penjelasan penyelesaian langsung.');
    }
    if ($method === 'forum' && in_array($status, ['Telah Dibahas', 'Sedang Diproses', 'Selesai'], true)
        && $result === '' && ($statusChanged || $report['forum_result'])) {
        fail(422, 'Isi hasil pembahasan fakultas.');
    }
    $period = $method === 'forum' && $period !== '' ? $period : null;
    $result = $method === 'forum' && $result !== '' ? $result : null;
    $methodChanged = $method !== $report['method'];
    $changed = $statusChanged || $methodChanged ||
        $period !== $report['forum_period'] || $result !== $report['forum_result'];

    if ($changed) {
        runQuery($db, '
            UPDATE reports SET status = ?, method = ?, forum_period = ?, forum_result = ?
            WHERE id = ?
        ', [$status, $method, $period, $result, $id]);
    }
    if ($statusChanged || $methodChanged) {
        $historyNote = $method === 'forum' ? 'Jalur Forum Advokasi' : 'Penanganan langsung';
        addHistory($db, $id, $status, $historyNote, (int) $user['id']);
    }
    if ($note !== '') {
        runQuery($db, '
            INSERT INTO responses (report_id, admin_id, message) VALUES (?, ?, ?)
        ', [$id, $user['id'], $note]);
    }
    if ($changed || $note !== '') {
        $title = $statusChanged ? 'Status laporan diperbarui' : 'Pembaruan laporan';
        $code = reportCode($id);
        notifyUser($db, (int) $report['user_id'], $code, $title,
            'Laporan ' . $code . ' memiliki pembaruan. Buka detail laporan.');
    }
}
