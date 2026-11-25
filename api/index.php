<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/laporan.php';
require __DIR__ . '/agenda.php';
require __DIR__ . '/notifications.php';
require_once __DIR__ . '/security.php';

ini_set('display_errors', '0');
ini_set('log_errors', '1');
securityHeaders();
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
    $value = array_key_exists($key, $input) ? $input[$key] : '';
    if (!is_string($value) || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $value)) {
        fail(422, 'Isian formulir tidak valid.');
    }
    $value = trim($value);
    $blank = preg_match('/^[\s\p{Z}\x{200B}\x{FEFF}]*$/u', $value);
    if (($required && $blank) || mb_strlen($value) > $max) {
        fail(422, 'Lengkapi isian formulir sesuai batas panjangnya.');
    }
    return $value;
}

function positiveId(mixed $value): int
{
    // JSON booleans/floats must not be coerced into another record's ID.
    if ((!is_int($value) && !is_string($value)) ||
        !preg_match('/^[1-9][0-9]{0,9}$/D', (string) $value) ||
        (int) $value > 4294967295) {
        fail(422, 'Nomor tidak valid.');
    }
    return (int) $value;
}

function passwordField(array $input): string
{
    $value = $input['password'] ?? null;
    $minimum = minimumPasswordLength();
    if (!is_string($value) || !passwordIsValid($value, $minimum)) {
        fail(422, 'Gunakan minimal ' . $minimum . ' karakter dan maksimal 72 byte.');
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
        runQuery($db, "
            INSERT INTO users (name, nim, email, password_hash, role)
            VALUES (?, ?, ?, ?, 'mahasiswa')
        ", [$name, $nim, $email, $hash]);
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
    reserveLoginAttempt($db, 'ip:' . ($_SERVER['REMOTE_ADDR'] ?? ''), 60);
    if (random_int(1, 100) === 1) {
        runQuery($db, 'DELETE FROM login_limits WHERE expires_at <= ? LIMIT 1000', [time()]);
    }
    $account = str_contains($identifier, '@')
        ? runQuery($db, "
            SELECT id, name, role, password_hash FROM users
            WHERE email = ? AND (role = 'admin' OR nim IS NULL OR nim = '')
        ", [strtolower($identifier)])->fetch()
        : runQuery($db, "
            SELECT id, name, role, password_hash FROM users
            WHERE nim = ? AND role = 'mahasiswa'
        ", [normalizeNim($identifier)])->fetch();
    $normalized = str_contains($identifier, '@') ? strtolower($identifier) : normalizeNim($identifier);
    $bucket = $account ? 'account:' . $account['id'] : 'unknown:' . $normalized;
    reserveLoginAttempt($db, $bucket, 5);
    if (!$account || !$account['password_hash'] ||
        !password_verify($password, $account['password_hash'])) {
        fail(401, 'NIM, email, atau kata sandi tidak cocok.');
    }
    runQuery($db, 'DELETE FROM login_limits WHERE bucket = ?', [hash('sha256', $bucket)]);
    unset($account['password_hash']);

    $account['id'] = (int) $account['id'];
    session_regenerate_id(true);
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    $_SESSION['user_id'] = $account['id'];
    $_SESSION['authenticated_at'] = time();
    return $account;
}

function currentUser(PDO $db): ?array
{
    if (!isset($_SESSION['user_id'])) {
        return null;
    }
    if (time() - ($_SESSION['authenticated_at'] ?? 0) >= 28800) {
        unset($_SESSION['user_id'], $_SESSION['authenticated_at']);
        session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
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
        'registrationOpen' => registrationIsOpen(),
        'passwordMinimum' => minimumPasswordLength(),
        'reports' => $user ? getReports($db, $user) : [],
        'events' => getAgenda($db, ($user['role'] ?? '') === 'admin'),
        'csrf' => $_SESSION['csrf'],
        'notifications' => $user ? getNotifications($db, $user['id']) : [],
    ];

    output(array_merge($state, $extra));
}

function readRequest(): array
{
    if (!preg_match('~^application/json(?:\s*;[^\r\n]*)?$~iD', $_SERVER['CONTENT_TYPE'] ?? '')) {
        fail(415, 'Format permintaan harus JSON.');
    }
    if (!hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) {
        fail(403, 'Sesi tidak valid. Muat ulang halaman dan coba kembali.');
    }
    $limit = 4 * 1024 * 1024 + 32768;
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > $limit) {
        fail(413, 'Ukuran permintaan terlalu besar.');
    }
    $raw = file_get_contents('php://input', false, null, 0, $limit + 1);
    if ($raw === false || strlen($raw) > $limit) {
        fail(413, 'Ukuran permintaan terlalu besar.');
    }
    $input = json_decode($raw);
    if (!$input instanceof stdClass) {
        fail(400, 'Data permintaan tidak valid.');
    }
    return (array) $input;
}

if (!appIsLocal() && !requestUsesHttps()) {
    output(['error' => 'Gunakan HTTPS untuk mengakses Suara Teknik.'], 403);
}

ini_set('session.use_strict_mode', '1');
session_name('suara_teknik');
session_set_cookie_params([
    'httponly' => true,
    'secure' => requestUsesHttps(),
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
    $action = field($input, 'action', 32);
    if ($action === 'register') {
        if (!registrationIsOpen()) {
            fail(403, 'Pendaftaran mandiri ditutup. Hubungi pengelola Suara Teknik.');
        }
        limitRegistration();
        registerAccount($db, $input);
        sendState($db, $user);
    }
    if ($action === 'login') {
        sendState($db, loginAccount($db, $input));
    }
    if ($action === 'logout') {
        unset($_SESSION['user_id'], $_SESSION['authenticated_at']);
        session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        sendState($db, null);
    }
    if (!$user) {
        fail(401, 'Silakan masuk kembali.');
    }

    if ($action === 'notifications-read') {
        if (array_key_exists('id', $input)) {
            $notificationId = positiveId($input['id']);
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
