<?php
require_once __DIR__ . '/../models/Favorite.php';

/**
 * Favori uç noktaları. Tüm işlemler giriş gerektirir.
 * GET ?ids=1 sadece favori book_id listesini döner (frontend senkronu).
 */
class FavoriteController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function list(): void {
        $userId = Auth::requireAuth();
        $model = new Favorite($this->db);
        if (Request::query('ids')) {
            Response::json($model->idsByUser($userId), 200);
        }
        Response::json($model->getByUser($userId), 200);
    }

    public function add(): void {
        $userId = Auth::requireAuth();
        $data = Request::body();
        if (empty($data['book_id'])) {
            Response::error('book_id zorunludur.', 422);
        }
        (new Favorite($this->db))->add($userId, (int) $data['book_id']);
        Response::ok('Favorilere eklendi.');
    }

    public function delete($bookId): void {
        $userId = Auth::requireAuth();
        (new Favorite($this->db))->delete($userId, $bookId);
        Response::ok('Favorilerden çıkarıldı.');
    }
}
