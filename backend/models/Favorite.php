<?php
/**
 * Favorite model lets users mark books they like. Each record associates a
 * user with a book. Users can add a book to favorites and remove it.
 */
class Favorite {
    private $conn;
    private $table_name = "favorites";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getByUser($user_id) {
        $stmt = $this->conn->prepare("SELECT f.book_id, b.title, b.author, b.price FROM " . $this->table_name . " f JOIN books b ON f.book_id = b.id WHERE f.user_id = :user_id");
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function add($user_id, $book_id) {
        $stmt = $this->conn->prepare("INSERT IGNORE INTO " . $this->table_name . " (user_id, book_id, created_at) VALUES (:user_id, :book_id, NOW())");
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->bindParam(':book_id', $book_id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    public function delete($user_id, $book_id) {
        $stmt = $this->conn->prepare("DELETE FROM " . $this->table_name . " WHERE user_id = :user_id AND book_id = :book_id");
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->bindParam(':book_id', $book_id, PDO::PARAM_INT);
        return $stmt->execute();
    }
}
?>