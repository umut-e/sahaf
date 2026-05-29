<?php
/**
 * JSON yanıt yardımcıları. Her uç noktada tutarlı çıktı sağlar:
 *   - listeler: ['data' => [...], 'total' => N, 'page' => P, 'limit' => L]
 *   - tekil kayıtlar: düz nesne
 *   - hatalar: ['error' => '...']
 */
class Response {
    public static function json($data, int $code = 200): void {
        http_response_code($code);
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function error(string $message, int $code = 400): void {
        self::json(['error' => $message], $code);
    }

    public static function ok(string $message = 'Başarılı', array $extra = []): void {
        self::json(array_merge(['message' => $message], $extra), 200);
    }

    public static function created(string $message = 'Oluşturuldu', array $extra = []): void {
        self::json(array_merge(['message' => $message], $extra), 201);
    }

    public static function paginated(array $rows, int $total, int $page, int $limit): void {
        self::json([
            'data'  => $rows,
            'total' => $total,
            'page'  => $page,
            'limit' => $limit,
            'pages' => $limit > 0 ? (int) ceil($total / $limit) : 1,
        ], 200);
    }
}
