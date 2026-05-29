<?php
require_once __DIR__ . '/Response.php';

/**
 * Header tabanlı basit yetkilendirme.
 *
 * İstemci giriş sonrası `X-User-Id` ve `X-User-Role` header'larını gönderir;
 */
class Auth {
    public static function userId(): ?int {
        $id = $_SERVER['HTTP_X_USER_ID'] ?? null;
        return $id !== null && $id !== '' ? (int) $id : null;
    }

    public static function role(): string {
        return $_SERVER['HTTP_X_USER_ROLE'] ?? 'guest';
    }

    public static function isAdmin(): bool {
        return self::role() === 'admin';
    }

    /** Giriş yapılmamışsa 401 ile durur, aksi halde kullanıcı id döner. */
    public static function requireAuth(): int {
        $id = self::userId();
        if (!$id) {
            Response::error('Bu işlem için giriş yapmalısınız.', 401);
        }
        return $id;
    }

    /** Admin değilse 403 ile durur. */
    public static function requireAdmin(): int {
        $id = self::requireAuth();
        if (!self::isAdmin()) {
            Response::error('Bu işlem için yetkiniz yok.', 403);
        }
        return $id;
    }
}
