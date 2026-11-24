<?php
declare(strict_types=1);

function getNotifications(PDO $db, int $id): array {
    return runQuery($db, 'SELECT id,report_code AS reportCode,title,message,is_read AS isRead,created_at AS createdAt FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 100', [$id])->fetchAll();
}
function notifyUser(PDO $db, int $id, ?string $code, string $title, string $message): void {
    runQuery($db, 'INSERT INTO notifications (user_id,report_code,title,message) VALUES (?,?,?,?)', [$id,$code,$title,$message]);
}
function notifyAdmins(PDO $db, ?string $code, string $title, string $message): void {
    foreach (runQuery($db, "SELECT id FROM users WHERE role='admin'")->fetchAll() as $admin) notifyUser($db,(int)$admin['id'],$code,$title,$message);
}
