<?php
/**
 * CartItem modeli — sepet işlemleri. (user_id, book_id) benzersizdir;
 * aynı kitap tekrar eklenirse miktar artırılır.
 */
class CartItem {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    /** Kullanıcının sepeti, kitap bilgileriyle birlikte. */
    public function getByUser($userId): array {
        $sql = "SELECT ci.id, ci.book_id, ci.quantity,
                       b.title, b.author, b.price, b.stock,
                       (SELECT image_path FROM book_images WHERE book_id = b.id ORDER BY id ASC LIMIT 1) AS primary_image
                FROM cart_items ci
                JOIN books b ON ci.book_id = b.id
                WHERE ci.user_id = :uid
                ORDER BY ci.id DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':uid' => $userId]);
        return $stmt->fetchAll();
    }

    public function add($userId, $bookId, int $quantity = 1): bool {
        $sql = "INSERT INTO cart_items (user_id, book_id, quantity, created_at)
                VALUES (:uid, :bid, :q, NOW())
                ON DUPLICATE KEY UPDATE quantity = quantity + :q2";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':uid' => $userId, ':bid' => $bookId, ':q' => $quantity, ':q2' => $quantity]);
    }

    public function updateQuantity($id, $userId, int $quantity): bool {
        $stmt = $this->db->prepare("UPDATE cart_items SET quantity = :q WHERE id = :id AND user_id = :uid");
        return $stmt->execute([':q' => max(1, $quantity), ':id' => $id, ':uid' => $userId]);
    }

    public function delete($id, $userId): bool {
        $stmt = $this->db->prepare("DELETE FROM cart_items WHERE id = :id AND user_id = :uid");
        return $stmt->execute([':id' => $id, ':uid' => $userId]);
    }

    public function clear($userId): bool {
        return $this->db->prepare("DELETE FROM cart_items WHERE user_id = :uid")->execute([':uid' => $userId]);
    }
}
