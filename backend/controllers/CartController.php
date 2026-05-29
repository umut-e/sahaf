<?php
require_once __DIR__ . '/../models/CartItem.php';

/**
 * Sepet uç noktaları. Tüm işlemler giriş gerektirir.
 */
class CartController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function list(): void {
        $userId = Auth::requireAuth();
        Response::json((new CartItem($this->db))->getByUser($userId), 200);
    }

    public function add(): void {
        $userId = Auth::requireAuth();
        $data = Request::body();
        if (empty($data['book_id'])) {
            Response::error('book_id zorunludur.', 422);
        }
        $qty = max(1, (int) ($data['quantity'] ?? 1));
        (new CartItem($this->db))->add($userId, (int) $data['book_id'], $qty);
        Response::ok('Sepete eklendi.');
    }

    public function update($id): void {
        $userId = Auth::requireAuth();
        $data = Request::body();
        $qty = max(1, (int) ($data['quantity'] ?? 1));
        (new CartItem($this->db))->updateQuantity($id, $userId, $qty);
        Response::ok('Sepet güncellendi.');
    }

    public function delete($id): void {
        $userId = Auth::requireAuth();
        (new CartItem($this->db))->delete($id, $userId);
        Response::ok('Üründen çıkarıldı.');
    }
}
