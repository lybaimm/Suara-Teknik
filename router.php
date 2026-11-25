<?php
// Router for the PHP development server. Apache uses the folder .htaccess files.
require_once __DIR__ . '/api/security.php';
ini_set('display_errors', '0');
ini_set('log_errors', '1');
securityHeaders();
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
$segments = explode('/', str_replace('\\', '/', $path));
foreach ($segments as $segment) {
    if (str_starts_with($segment, '.') || in_array(strtolower($segment), ['private', 'database', 'scripts', 'tests', 'vendor'], true)) {
        http_response_code(404);
        exit('Not found');
    }
}
// Returning false lets the development server discard PHP response headers.
// Serve the HTML entry point here so its CSP also applies on localhost.
if ($path === '/' || strcasecmp($path, '/index.html') === 0) {
    header('Content-Type: text/html; charset=utf-8');
    readfile(__DIR__ . '/index.html');
    return true;
}
return false;
