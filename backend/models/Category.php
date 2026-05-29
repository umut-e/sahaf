<?php
/**
 * Category modeli — kategori CRUD. Listede her kategorinin (aktif) kitap
 * sayısı da döner.
 */
class Category {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function all(): array {
        $sql = "SELECT c.id, c.name,
                       (SELECT COUNT(*) FROM books b WHERE b.category_id = c.id AND b.is_active = 1) AS book_count
                FROM categories c
                ORDER BY c.name ASC";
        return $this->db->query($sql)->fetchAll();
    }

    public function find($id) {
        $stmt = $this->db->prepare("SELECT id, name FROM categories WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        return $stmt->fetch();
    }

    public function create(string $name): int {
        $stmt = $this->db->prepare("INSERT INTO categories (name, created_at, updated_at) VALUES (:n, NOW(), NOW())");
        $stmt->execute([':n' => $name]);
        return (int) $this->db->lastInsertId();
    }

    public function update($id, string $name): bool {
        $stmt = $this->db->prepare("UPDATE categories SET name = :n, updated_at = NOW() WHERE id = :id");
        return $stmt->execute([':n' => $name, ':id' => $id]);
    }

    public function delete($id): bool {
        // FK ON DELETE SET NULL: ilgili kitaplar kategorisiz kalır, silinmez.
        return $this->db->prepare("DELETE FROM categories WHERE id = :id")->execute([':id' => $id]);
    }
}
