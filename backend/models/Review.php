<?php
/**
 * Review modeli — kitap puanları ve yorumları. (user_id, book_id) benzersizdir
 * (her kullanıcı kitap başına tek yorum; tekrar gönderirse güncellenir).
 * Yorumlar beğenilebilir (review_likes) ve anonim olabilir (is_anonymous).
 */
class Review {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    /** Bir kitabın yorumları. Giriş yapan kullanıcı için beğeni durumu da döner. */
    public function getByBook($bookId, $viewerId = null): array {
        $sql = "SELECT r.id, r.rating, r.comment, r.created_at, r.is_anonymous,
                       u.name AS user_name,
                       (SELECT COUNT(*) FROM review_likes WHERE review_id = r.id) AS like_count,
                       EXISTS(SELECT 1 FROM review_likes WHERE review_id = r.id AND user_id = :viewer) AS liked_by_me
                FROM reviews r
                JOIN users u ON r.user_id = u.id
                WHERE r.book_id = :bid
                ORDER BY r.created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':bid' => $bookId, ':viewer' => $viewerId ?: 0]);
        return $stmt->fetchAll();
    }

    public function hasReviewed($userId, $bookId): bool {
        $stmt = $this->db->prepare("SELECT 1 FROM reviews WHERE user_id = :u AND book_id = :b LIMIT 1");
        $stmt->execute([':u' => $userId, ':b' => $bookId]);
        return (bool) $stmt->fetchColumn();
    }

    /** Kullanıcı, teslim edilen bir siparişte bu kitabı satın aldıysa yorum yapabilir. */
    public function canReview($userId, $bookId): bool {
        $sql = "SELECT 1 FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                WHERE o.user_id = :u AND oi.book_id = :b AND o.status = 'completed' LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':u' => $userId, ':b' => $bookId]);
        return (bool) $stmt->fetchColumn();
    }

    public function upsert($userId, $bookId, int $rating, ?string $comment, bool $anonymous = false): bool {
        $sql = "INSERT INTO reviews (user_id, book_id, rating, comment, is_anonymous, created_at, updated_at)
                VALUES (:u, :b, :r, :c, :a, NOW(), NOW())
                ON DUPLICATE KEY UPDATE rating = :r2, comment = :c2, is_anonymous = :a2, updated_at = NOW()";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':u' => $userId, ':b' => $bookId, ':r' => $rating, ':c' => $comment, ':a' => $anonymous ? 1 : 0,
            ':r2' => $rating, ':c2' => $comment, ':a2' => $anonymous ? 1 : 0,
        ]);
    }

    public function like($reviewId, $userId): bool {
        $stmt = $this->db->prepare(
            "INSERT IGNORE INTO review_likes (review_id, user_id, created_at) VALUES (:r, :u, NOW())"
        );
        return $stmt->execute([':r' => $reviewId, ':u' => $userId]);
    }

    public function unlike($reviewId, $userId): bool {
        $stmt = $this->db->prepare("DELETE FROM review_likes WHERE review_id = :r AND user_id = :u");
        return $stmt->execute([':r' => $reviewId, ':u' => $userId]);
    }

    public function likeCount($reviewId): int {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM review_likes WHERE review_id = :r");
        $stmt->execute([':r' => $reviewId]);
        return (int) $stmt->fetchColumn();
    }
}
