<?php
/**
 * Favorite modeli — kullanıcının favori kitapları. (user_id, book_id) benzersiz.
 */
class Favorite {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getByUser($userId): array {
        $sql = "SELECT f.book_id, b.title, b.author, b.price, b.stock,
                       (SELECT image_path FROM book_images WHERE book_id = b.id ORDER BY id ASC LIMIT 1) AS primary_image,
                       (SELECT ROUND(AVG(rating),1) FROM reviews WHERE book_id = b.id) AS avg_rating
                FROM favorites f
                JOIN books b ON f.book_id = b.id
                WHERE f.user_id = :uid AND b.is_active = 1
                ORDER BY f.id DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':uid' => $userId]);
        return $stmt->fetchAll();
    }

    /** Sadece favori book_id listesi (frontend senkronu için). */
    public function idsByUser($userId): array {
        $stmt = $this->db->prepare("SELECT book_id FROM favorites WHERE user_id = :uid");
        $stmt->execute([':uid' => $userId]);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    public function add($userId, $bookId): bool {
        $stmt = $this->db->prepare(
            "INSERT IGNORE INTO favorites (user_id, book_id, created_at) VALUES (:u, :b, NOW())"
        );
        return $stmt->execute([':u' => $userId, ':b' => $bookId]);
    }

    public function delete($userId, $bookId): bool {
        $stmt = $this->db->prepare("DELETE FROM favorites WHERE user_id = :u AND book_id = :b");
        return $stmt->execute([':u' => $userId, ':b' => $bookId]);
    }
}
