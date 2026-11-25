<?php
declare(strict_types=1);

function securityHeaders(): void
{
    header_remove('X-Powered-By');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
}

// File locks keep limits effective across PHP workers and new browser sessions.
// Use REMOTE_ADDR, never an untrusted X-Forwarded-For header.
function consumeAuthAttempt(string $bucket, int $maximum, int $window): void
{
    $directory = getenv('SUARA_RATE_LIMIT_DIR') ?: sys_get_temp_dir()
        . '/suara-teknik-auth-' . substr(hash('sha256', __DIR__), 0, 16);
    if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('Cannot create authentication limiter storage');
    }
    $file = $directory . '/' . hash('sha256', $bucket) . '.json';
    $handle = @fopen($file, 'c+');
    if ($handle === false) throw new RuntimeException('Cannot open authentication limiter storage');
    try {
        if (!flock($handle, LOCK_EX)) throw new RuntimeException('Cannot lock authentication limiter storage');
        $state = json_decode(stream_get_contents($handle), true);
        $now = time();
        if (!is_array($state) || ($state['expires'] ?? 0) <= $now) {
            $state = ['count' => 0, 'expires' => $now + $window];
        }
        if ($state['count'] >= $maximum) {
            header('Retry-After: ' . max(1, $state['expires'] - $now));
            fail(429, 'Terlalu banyak percobaan. Tunggu beberapa saat lalu coba kembali.');
        }
        $state['count']++;
        rewind($handle);
        if (!ftruncate($handle, 0) || fwrite($handle, json_encode($state)) === false || !fflush($handle)) {
            throw new RuntimeException('Cannot update authentication limiter storage');
        }
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function limitRegistration(): void
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    consumeAuthAttempt('register-ip:' . $ip, 20, 3600);
}

function appIsLocal(): bool
{
    $mode = getenv('SUARA_ENV');
    if ($mode !== false && $mode !== 'local') {
        return false;
    }
    if (PHP_SAPI === 'cli') {
        return true;
    }

    $remote = $_SERVER['REMOTE_ADDR'] ?? '';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    return in_array($remote, ['127.0.0.1', '::1'], true)
        && preg_match('/^(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]+)?$/iD', $host) === 1;
}

function requestUsesHttps(): bool
{
    $https = strtolower($_SERVER['HTTPS'] ?? '');
    return in_array($https, ['on', '1'], true)
        || getenv('SUARA_TLS_TERMINATED') === '1';
}

function registrationIsOpen(): bool
{
    return appIsLocal() || getenv('SUARA_OPEN_REGISTRATION') === '1';
}

function minimumPasswordLength(): int
{
    return appIsLocal() ? 6 : 15;
}

function passwordIsValid(string $password, int $minimum): bool
{
    return strlen($password) <= 72
        && !str_contains($password, "\0")
        && mb_check_encoding($password, 'UTF-8')
        && mb_strlen($password, 'UTF-8') >= $minimum;
}

function normalizeNim(string $value): string
{
    return mb_strtoupper(trim($value), 'UTF-8');
}

function reserveLoginAttempt(PDO $db, string $bucket, int $limit): void
{
    $key = hash('sha256', $bucket);
    $now = time();

    $db->beginTransaction();
    try {
        runQuery($db, '
            INSERT INTO login_limits (bucket, attempts, expires_at)
            VALUES (?, 1, ?)
            ON DUPLICATE KEY UPDATE
                attempts = IF(expires_at <= ?, 1, LEAST(attempts + 1, ?)),
                expires_at = IF(expires_at <= ?, ?, expires_at)
        ', [$key, $now + 900, $now, $limit + 1, $now, $now + 900]);

        $entry = runQuery($db, '
            SELECT attempts, expires_at FROM login_limits WHERE bucket = ?
        ', [$key])->fetch();
        $db->commit();
    } catch (Throwable $error) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $error;
    }

    if ((int) $entry['attempts'] > $limit) {
        header('Retry-After: ' . max(1, (int) $entry['expires_at'] - $now));
        fail(429, 'Terlalu banyak percobaan masuk. Coba lagi beberapa menit lagi.');
    }
}
