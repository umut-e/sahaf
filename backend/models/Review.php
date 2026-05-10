<?php
/**
 * Review model handles ratings and comments on books. Users can leave a
 * rating (1-5) and an optional comment for each book. Each user can only
 * leave one review per book. Reviews are ordered by date.
 */
class Review {
    private $conn;
    private $table_name = "reviews";

    public function __construct($db) {
        $this->conn = $db;
    }

    // Get reviews for a book
    public function getByBook($book_id) {
        $stmt = $this->conn->prepare("SELECT r.id, r.rating, r.comment, r.created_at, u.name as user_name FROM " . $this->table_name . " r JOIN users u ON r.user_id = u.id WHERE r.book_id = :book_id ORDER BY r.created_at DESC");
        $stmt->bindParam(':book_id', $book_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Add or update a review
    public function upsert($user_id, $book_id, $rating, $comment) {
        // check if existing
        $stmt = $this->conn->prepare("SELECT id FROM " . $this->table_name . " WHERE user_id = :user_id AND book_id = :book_id");
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->bindParam(':book_id', $book_id, PDO::PARAM_INT);
        $stmt->execute();
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            $update = $this->conn->prepare("UPDATE " . $this->table_name . " SET rating = :rating, comment = :comment, updated_at = NOW() WHERE id = :id");
            $update->bindParam(':rating', $rating, PDO::PARAM_INT);
            $update->bindParam(':comment', $comment);
            $update->bindParam(':id', $existing['id'], PDO::PARAM_INT);
            return $update->execute();
        } else {
            $insert = $this->conn->prepare("INSERT INTO " . $this->table_name . " (user_id, book_id, rating, comment, created_at, updated_at) VALUES (:user_id, :book_id, :rating, :comment, NOW(), NOW())");
            $insert->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $insert->bindParam(':book_id', $book_id, PDO::PARAM_INT);
            $insert->bindParam(':rating', $rating, PDO::PARAM_INT);
            $insert->bindParam(':comment', $comment);
            return $insert->execute();
        }
    }
}
?>