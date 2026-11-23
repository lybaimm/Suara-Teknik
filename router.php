<?php
// Router for the PHP development server. Apache uses the folder .htaccess files.
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
$segments = explode('/', str_replace('\\', '/', $path));
foreach ($segments as $segment) {
    if (str_starts_with($segment, '.') || in_array($segment, ['private', 'database', 'scripts', 'vendor'], true)) {
        http_response_code(404);
        exit('Not found');
    }
}
return false;
