<?php
require_once __DIR__ . '/../models/Category.php';

/**
 * Kategori uç noktaları. Listeleme herkese açık; oluştur/güncelle/sil admin.
 */
class CategoryController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function list(): void {
        Response::json((new Category($this->db))->all(), 200);
    }

    public function create(): void {
        Auth::requireAdmin();
        $data = Request::body();
        if (empty($data['name'])) {
            Response::error('Kategori adı zorunludur.', 422);
        }
        $id = (new Category($this->db))->create(trim($data['name']));
        Response::created('Kategori eklendi.', ['id' => $id]);
    }

    public function update($id): void {
        Auth::requireAdmin();
        $data = Request::body();
        if (empty($data['name'])) {
            Response::error('Kategori adı zorunludur.', 422);
        }
        (new Category($this->db))->update($id, trim($data['name']));
        Response::ok('Kategori güncellendi.');
    }

    public function delete($id): void {
        Auth::requireAdmin();
        (new Category($this->db))->delete($id);
        Response::ok('Kategori silindi.');
    }
}
