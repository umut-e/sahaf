<?php
require_once __DIR__ . '/../config/db.php';

/**
 * Category model provides basic CRUD operations on the categories table. This
 * table stores book categories and allows books to be grouped.
 */
class Category {
    private $conn;
    private $table_name = "categories";

    public function __construct($db) {
        $this->conn = $db;
    }

    // Get all categories
    public function all() {
        $stmt = $this->conn->query("SELECT * FROM " . $this->table_name . " ORDER BY name");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Create a category
    public function create($name) {
        $stmt = $this->conn->prepare("INSERT INTO " . $this->table_name . " (name, created_at, updated_at) VALUES (:name, NOW(), NOW())");
        $stmt->bindParam(':name', $name);
        return $stmt->execute();
    }

    // Delete a category
    public function delete($id) {
        $stmt = $this->conn->prepare("DELETE FROM " . $this->table_name . " WHERE id = :id");
        $stmt->bindParam(':id', $id);
        return $stmt->execute();
    }
}
?>