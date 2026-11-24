<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/laporan.php';
require __DIR__ . '/agenda.php';
require __DIR__ . '/notifications.php';

header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function output(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function fail(int $status, string $message): void
{
    throw new RuntimeException($message, $status);
}

function field(array $input, string $key, int $max, bool $required = true): string
{
    $value = $input[$key] ?? '';
    if (!is_string($value)) {
        fail(422, 'Isian formulir tidak valid.');
    }
    $value = trim($value);
    if (($required && $value === '') || mb_strlen($value) > $max) {
        fail(422, 'Lengkapi isian formulir sesuai batas panjangnya.');
    }
    return $value;
}

function passwordField(array $input): string
{
    $value = $input['password'] ?? null;
    if (!is_string($value) || strlen($value) < 6 || strlen($value) > 72 ||
        str_contains($value, "\0")) {
        fail(422, 'Gunakan kata sandi sepanjang 6 sampai 72 byte.');
    }
    return $value;
}

function emailField(array $input): string
{
    $email = strtolower(field($input, 'email', 100));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        fail(422, 'Masukkan alamat email yang valid.');
    }
    return $email;
}

function normalizeNim(string $value): string
{
    return mb_strtoupper(trim($value), 'UTF-8');
}

function registerAccount(PDO $db, array $input): void
{
    $name = field($input, 'name', 100);
    $nim = normalizeNim(field($input, 'nim', 30));
    if (!preg_match('/^[A-Z0-9-]{1,30}$/D', $nim)) {
        fail(422, 'NIM hanya boleh berisi huruf, angka, atau tanda hubung.');
    }
    $email = emailField($input);
    $hash = password_hash(passwordField($input), PASSWORD_DEFAULT);

    try {
        runQuery($db, '
            INSERT INTO users (name, nim, email, password_hash) VALUES (?, ?, ?, ?)
        ', [$name, $nim, $email, $hash]);
    } catch (PDOException $error) {
        if ((int) ($error->errorInfo[1] ?? 0) === 1062) {
            fail(409, 'Email atau NIM ini sudah digunakan.');
        }
        throw $error;
    }
}

function loginAccount(PDO $db, array $input): array
{
    $identifier = field($input, 'identifier', 100);
    $password = passwordField($input);
    $account = str_contains($identifier, '@')
        ? runQuery($db, "
            SELECT id, name, role, password_hash FROM users
            WHERE email = ? AND (role = 'admin' OR nim IS NULL OR nim = '')
        ", [strtolower($identifier)])->fetch()
        : runQuery($db, "
            SELECT id, name, role, password_hash FROM users
            WHERE nim = ? AND role = 'mahasiswa'
        ", [normalizeNim($identifier)])->fetch();
    if (!$account || !$account['password_hash'] ||
        !password_verify($password, $account['password_hash'])) {
        fail(401, 'NIM, email, atau kata sandi tidak cocok.');
    }
    unset($account['password_hash']);

    $account['id'] = (int) $account['id'];
    session_regenerate_id(true);
    $_SESSION['user_id'] = $account['id'];
    return $account;
}

function currentUser(PDO $db): ?array
{
    if (!isset($_SESSION['user_id'])) {
        return null;
    }
    $user = runQuery(
        $db,
        'SELECT id, name, role FROM users WHERE id = ?',
        [$_SESSION['user_id']]
    )->fetch();
    if (!$user) {
        unset($_SESSION['user_id']);
        return null;
    }
    $user['id'] = (int) $user['id'];
    return $user;
}

function sendState(PDO $db, ?array $user, array $extra = []): void
{
    $state = [
        'user' => $user,
        'reports' => $user ? getReports($db, $user) : [],
        'events' => getAgenda($db, ($user['role'] ?? '') === 'admin'),
        'csrf' => $_SESSION['csrf'],
        'notifications' => $user ? getNotifications($db, $user['id']) : [],
    ];

    output(array_merge($state, $extra));
}

function readRequest(): array
{
    if (!str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
        fail(415, 'Format permintaan harus JSON.');
    }
    if (!hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) {
        fail(403, 'Sesi tidak valid. Muat ulang halaman dan coba kembali.');
    }
    $limit = 4 * 1024 * 1024 + 32768;
    $raw = file_get_contents('php://input', false, null, 0, $limit + 1);
    if ($raw === false || strlen($raw) > $limit) {
        fail(413, 'Ukuran permintaan terlalu besar.');
    }
    $input = json_decode($raw, true);
    if (!is_array($input)) {
        fail(400, 'Data permintaan tidak valid.');
    }
    return $input;
}

ini_set('session.use_strict_mode', '1');
session_name('suara_teknik');
session_set_cookie_params([
    'httponly' => true,
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'samesite' => 'Lax',
]);
session_start();
$_SESSION['csrf'] ??= bin2hex(random_bytes(32));

try {
    $db = connectDatabase();
    $user = currentUser($db);
    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'GET') {
        if (isset($_GET['photo'])) {
            if (!$user || !is_string($_GET['photo'])) {
                fail(404, 'Foto tidak ditemukan.');
            }
            sendPhoto($db, $user, reportNumber($_GET['photo']));
        }
        sendState($db, $user);
    }
    if ($method !== 'POST') {
        fail(405, 'Metode permintaan tidak didukung.');
    }

    $input = readRequest();
    $action = $input['action'] ?? '';
    if ($action === 'register') {
        registerAccount($db, $input);
        sendState($db, $user);
    }
    if ($action === 'login') {
        sendState($db, loginAccount($db, $input));
    }
    if ($action === 'logout') {
        unset($_SESSION['user_id']);
        session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        sendState($db, null);
    }
    if (!$user) {
        fail(401, 'Silakan masuk kembali.');
    }

    if ($action === 'notifications-read') {
        if (isset($input['id'])) {
            $notificationId = filter_var($input['id'], FILTER_VALIDATE_INT, ['options'=>['min_range'=>1]]);
            if (!$notificationId) fail(422, 'Nomor notifikasi tidak valid.');
            runQuery($db, 'UPDATE notifications SET is_read=1 WHERE user_id=? AND id=?', [$user['id'],$notificationId]);
        } else runQuery($db, 'UPDATE notifications SET is_read=1 WHERE user_id=?', [$user['id']]);
        sendState($db, $user);
    }
    $db->beginTransaction();
    $extra = [];
    if ($action === 'follow-up' && $user['role'] === 'admin') {
        followUp($db, $user, $input, reportNumber(field($input, 'id', 13)));
    } elseif ($user['role'] === 'admin' &&
              in_array($action, ['event-create', 'event-edit', 'event-delete'], true)) {
        manageAgenda($db, $user, $input, $action);
    } elseif (in_array($action, ['create', 'edit', 'delete'], true) &&
              $user['role'] === 'mahasiswa') {
        $id = $action === 'create' ? null : reportNumber(field($input, 'id', 13));
        if ($action === 'delete') {
            requirePending($db, $user, $id);
            runQuery($db, 'DELETE FROM reports WHERE id = ?', [$id]);
            notifyAdmins($db, null, 'Laporan dihapus', 'Laporan '.reportCode($id).' telah dihapus pelapor.');
        } else {
            $extra['reportId'] = saveReport($db, $user, $input, $id);
            notifyAdmins($db, $extra['reportId'], $id === null ? 'Laporan baru masuk' : 'Laporan diperbarui', 'Periksa laporan '.$extra['reportId'].'.');
        }
    } else {
        fail(403, 'Tindakan ini tidak tersedia untuk akunmu.');
    }
    $db->commit();
    sendState($db, $user, $extra);
} catch (Throwable $error) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    $status = $error instanceof RuntimeException && !$error instanceof PDOException
        ? $error->getCode()
        : 500;
    if ($status >= 400 && $status < 500) {
        output(['error' => $error->getMessage()], $status);
    }
    error_log($error->getMessage());
    output(['error' => 'Server belum siap. Periksa MySQL dan konfigurasi database.'], 500);
}
