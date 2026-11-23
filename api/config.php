<?php
declare(strict_types=1);

function connectDatabase(): PDO
{
    $host = getenv('SUARA_DB_HOST') ?: '127.0.0.1';
    $port = getenv('SUARA_DB_PORT') ?: '3306';
    $name = getenv('SUARA_DB_NAME') ?: 'suara_teknik';
    $user = getenv('SUARA_DB_USER') ?: 'root';
    $password = getenv('SUARA_DB_PASSWORD');

    $db = new PDO(
        "mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4",
        $user,
        $password === false ? '' : $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    $db->exec("SET time_zone = '+07:00'");
    return $db;
}
