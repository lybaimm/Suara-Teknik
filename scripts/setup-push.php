<?php
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require __DIR__.'/../vendor/autoload.php';
$path=__DIR__.'/../private/vapid.php';
if (is_file($path)) { echo "Kunci sudah ada.\n"; exit; }
$subject=$argv[1] ?? '';
if (!filter_var($subject,FILTER_VALIDATE_EMAIL)) { exit("Gunakan: php scripts/setup-push.php email-admin@example.com\n"); }
$keys=\Minishlink\WebPush\VAPID::createVapidKeys();
$keys['subject']='mailto:'.$subject;
file_put_contents($path, '<?php return '.var_export($keys,true).';'.PHP_EOL, LOCK_EX);
chmod($path,0600);
echo "Web Push siap dikonfigurasi di browser.\n";
