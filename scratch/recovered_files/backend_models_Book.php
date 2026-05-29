<?php
require_once __DIR__ . '/../config/db.php';

/**
 * Book model encapsulates operations on the books table and related tables
 * such as book_images. It provides methods for listing books with
 * pagination and simple filtering, retrieving a single book, and performing
 * CRUD operations. For brevity only essential fields are handled here.
 */
class Book {
    private $conn;
    private $table_name = "books";

    public function __construct($db) {
        $this->conn = $db;
    }

    // List books with optional filters, pagination, and active check
    public function list($params = []) {
        $query = "SELECT b.*, c.name as category_name, COALESCE(r.avg_rating, 0) as avg_rating 
                  FROM " . $this->table_name . " b
                  LEFT JOIN categories c ON b.category_id = c.id
                  LEFT JOIN (SELECT book_id, AVG(rating) as avg_rating FROM reviews GROUP BY book_id) r ON b.id = r.book_id
                  WHERE 1=1";
        
        // Admin or specific requests might want to include inactive books. Default is active only.
        if (empty($params['include_inactive'])) {
            $query .= " AND b.is_active = 1";
        }

        $bindings = [];
        if (!empty($params['search'])) {
            $query .= " AND (b.title LIKE :search OR b.author LIKE :search OR b.description LIKE :search)";
            $bindings[':search'] = "%" . $params['search'] . "%";
        }
        if (!empty($params['category_id'])) {









































































































        foreach ($allowed as $field) {
            if (isset($data[$field])) {
                $fields[$field] = $data[$field];
            }
        }
        if (empty($fields)) {
            return false;
        }
        $setClause = [];
        foreach ($fields as $key => $val) {
            $setClause[] = "`$key` = :$key";
        }
        $query = "UPDATE " . $this->table_name . " SET " . implode(',', $setClause) . ", updated_at = NOW() WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        foreach ($fields as $key => $val) {
            $stmt->bindParam(':' . $key, $fields[$key]);
        }
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    // Delete a book (Soft delete to protect order history)
    public function delete($id) {
        $stmt = $this->conn->prepare("UPDATE " . $this->table_name . " SET is_active = 0 WHERE id = :id");
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    // Save book images (multiple)
    public function saveImages($book_id, $images) {
        $stmt = $this->conn->prepare("INSERT INTO book_images (book_id, image_path, created_at) VALUES (:book_id, :image_path, NOW())");
        foreach ($images as $img) {
            $stmt->bindParam(':book_id', $book_id);
            $stmt->bindParam(':image_path', $img);
            $stmt->execute();
        }
    }

    // Delete all images for a specific book
    public function deleteImages($book_id) {
        $stmt = $this->conn->prepare("DELETE FROM book_images WHERE book_id = :book_id");
        $stmt->bindParam(':book_id', $book_id, PDO::PARAM_INT);
        return $stmt->execute();
    }
}
?>
