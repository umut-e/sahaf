<?php
require_once __DIR__ . '/Response.php';

/**
 * Görsel yükleme yardımcısı. Yüklenen dosyaları backend/uploads/ altına
 * benzersiz adla kaydeder ve DB'de tutulan göreli yolu ("uploads/xxx.jpg")
 * döner. Mevcut görsel adlandırma kuralı korunur: book_<uniqid>.<ext>.
 */
class Uploader {
    private const ALLOWED = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    private const MAX_BYTES = 8 * 1024 * 1024; // 8MB

    /**
     * $_FILES içindeki tek veya çoklu ("images[]") yüklemeyi işler.
     * @return string[] kaydedilen göreli yollar
     */
    public static function handleImages(string $field = 'images', string $prefix = 'book_'): array {
        if (empty($_FILES[$field])) {
            return [];
        }
        $dir = __DIR__ . '/../uploads';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        $files = self::normalize($_FILES[$field]);
        $saved = [];
        foreach ($files as $file) {
            if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                continue;
            }
            if ($file['size'] > self::MAX_BYTES) {
                Response::error('Görsel boyutu çok büyük (en fazla 8MB).', 422);
            }
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, self::ALLOWED, true)) {
                Response::error('Geçersiz görsel türü.', 422);
            }
            $name = uniqid($prefix) . '.' . $ext;
            $target = $dir . '/' . $name;
            if (@move_uploaded_file($file['tmp_name'], $target)) {
                $saved[] = 'uploads/' . $name;
            }
        }
        return $saved;
    }

    /** Tek ve çoklu dosya yapısını ortak bir listeye normalize eder. */
    private static function normalize(array $f): array {
        if (!isset($f['name'])) {
            return [];
        }
        if (is_array($f['name'])) {
            $out = [];
            foreach ($f['name'] as $i => $_) {
                $out[] = [
                    'name'     => $f['name'][$i],
                    'tmp_name' => $f['tmp_name'][$i],
                    'error'    => $f['error'][$i],
                    'size'     => $f['size'][$i],
                ];
            }
            return $out;
        }
        return [$f];
    }
}
