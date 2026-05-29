<?php
/**
 * İstek gövdesi ve query parametreleri için yardımcılar.
 * JSON ve form-data (multipart) gövdelerini şeffaf şekilde okur.
 */
class Request {
    /** İstek gövdesini dizi olarak döner (JSON veya form-data). */
    public static function body(): array {
        $ct = $_SERVER['CONTENT_TYPE'] ?? '';
        if (stripos($ct, 'application/json') !== false) {
            $raw = file_get_contents('php://input');
            $decoded = json_decode($raw, true);
            return is_array($decoded) ? $decoded : [];
        }
        return $_POST ?? [];
    }

    public static function query(string $key, $default = null) {
        return $_GET[$key] ?? $default;
    }

    public static function int(string $key, int $default = 0): int {
        return isset($_GET[$key]) ? (int) $_GET[$key] : $default;
    }
}
