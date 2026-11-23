<?php
declare(strict_types=1);

$pushQueue = [];
function getNotifications(PDO $db, int $id): array {
    return runQuery($db, 'SELECT id,report_code AS reportCode,title,message,is_read AS isRead,created_at AS createdAt FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 100', [$id])->fetchAll();
}
function notifyUser(PDO $db, int $id, ?string $code, string $title, string $message): void {
    global $pushQueue;
    runQuery($db, 'INSERT INTO notifications (user_id,report_code,title,message) VALUES (?,?,?,?)', [$id,$code,$title,$message]);
    $pushQueue[] = [$id,$code,$title,$message];
}
function notifyAdmins(PDO $db, ?string $code, string $title, string $message): void {
    foreach (runQuery($db, "SELECT id FROM users WHERE role='admin'")->fetchAll() as $admin) notifyUser($db,(int)$admin['id'],$code,$title,$message);
}
function pushConfig(): array {
    $path = __DIR__.'/../private/vapid.php';
    if (!is_file($path) || !is_file(__DIR__.'/../vendor/autoload.php')) return [];
    $data = require $path;
    return is_array($data) ? $data : [];
}
function pushPublicKey(): string { return pushConfig()['publicKey'] ?? ''; }
function manageSubscription(PDO $db, array $user, array $input, string $action): void {
    $endpoint = field($input,'endpoint',2048);
    $hash = hash('sha256',$endpoint);
    if ($action === 'push-unsubscribe') {
        runQuery($db,'DELETE FROM push_subscriptions WHERE user_id=? AND endpoint_hash=?',[$user['id'],$hash]); return;
    }
    if (!pushPublicKey()) fail(503,'Web Push belum dikonfigurasi.');
    $url = parse_url($endpoint);
    $host = strtolower($url['host'] ?? '');
    // Allow known browser push services only; no arbitrary outbound URLs.
    $allowed = in_array($host,['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'],true) || str_ends_with($host,'.notify.windows.com') || str_ends_with($host,'.push.apple.com');
    if (($url['scheme'] ?? '') !== 'https' || !$allowed || isset($url['user']) || isset($url['pass']) || (isset($url['port']) && $url['port'] !== 443)) fail(422,'Endpoint push tidak didukung.');
    $key = field($input,'p256dh',120); $auth = field($input,'auth',64);
    if (!preg_match('/^[A-Za-z0-9_-]{87}$/D',$key) || !preg_match('/^[A-Za-z0-9_-]{22}$/D',$auth)) fail(422,'Kunci langganan tidak valid.');
    runQuery($db,'INSERT INTO push_subscriptions (user_id,endpoint_hash,endpoint,p256dh,auth) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), p256dh=VALUES(p256dh), auth=VALUES(auth)',[$user['id'],$hash,$endpoint,$key,$auth]);
}
function deliverPush(PDO $db): void {
    global $pushQueue;
    $config = pushConfig();
    if (!$config || !$pushQueue) return;
    try {
        require_once __DIR__.'/../vendor/autoload.php';
        $webPush = new \Minishlink\WebPush\WebPush(['VAPID'=>$config], ['TTL'=>3600], 5, ['allow_redirects'=>false]);
        foreach ($pushQueue as [$id,$code,$title,$message]) {
            foreach (runQuery($db,'SELECT * FROM push_subscriptions WHERE user_id=?',[$id])->fetchAll() as $sub) {
                try {
                    $subscription = \Minishlink\WebPush\Subscription::create(['endpoint'=>$sub['endpoint'],'publicKey'=>$sub['p256dh'],'authToken'=>$sub['auth'],'contentEncoding'=>'aes128gcm']);
                    // Generic text protects report contents on shared screens.
                    $delivery = $webPush->sendOneNotification($subscription,json_encode(['title'=>'Suara Teknik','body'=>'Ada pembaruan pada akunmu. Buka notifikasi untuk melihat detail.','reportCode'=>$code]));
                    if ($delivery->isSubscriptionExpired()) runQuery($db,'DELETE FROM push_subscriptions WHERE id=?',[$sub['id']]);
                    elseif (!$delivery->isSuccess()) error_log('Web Push delivery failed');
                } catch (Throwable $e) { error_log('Web Push: '.$e->getMessage()); }
            }
        }
    } catch (Throwable $e) { error_log('Web Push: '.$e->getMessage()); }
}
