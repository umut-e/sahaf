<?php
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Handle API requests
if (strpos($uri, '/api/') === 0) {
    require_once __DIR__ . '/backend/index.php';
    return true;
}

// Static files fallback
if ($uri !== '/' && file_exists(__DIR__ . $uri)) {
    return false; // serve the requested resource as-is
}

// Redirect root to frontend
if ($uri === '/') {
    header("Location: /frontend/index.html");
    exit;
}

return false;

